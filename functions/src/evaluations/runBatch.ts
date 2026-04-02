import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getProvider } from "../providers/registry";
import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
} from "./promptBuilder";

interface BatchRequest {
  queueId: string;
  judgeId?: string;
}

interface EvalTask {
  judgeId: string;
  judge: { name: string; systemPrompt: string; targetModel: string };
  question: {
    id: string;
    submissionId: string;
    questionType: string;
    questionText: string;
    answer: Record<string, unknown>;
  };
}

async function processWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const p = (async () => {
      try {
        await fn(item);
        succeeded++;
      } catch {
        failed++;
      }
    })();

    const tracked = p.then(() => {
      executing.delete(tracked);
    });
    executing.add(tracked);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return { succeeded, failed };
}

export const runBatchEvaluation = onCall(
  { memory: "1GiB", timeoutSeconds: 540 },
  async (request) => {
    const { queueId, judgeId } = request.data as BatchRequest;

    if (!queueId) {
      throw new HttpsError("invalid-argument", "queueId is required");
    }

    const firestore = admin.firestore();

    // Fetch queue info
    const queueDoc = await firestore.doc(`queues/${queueId}`).get();
    if (!queueDoc.exists) {
      throw new HttpsError("not-found", "Queue not found");
    }
    const queueName = queueDoc.data()?.name ?? "";

    // Fetch active assignments for this queue
    let assignmentsQuery = firestore
      .collection("assignments")
      .where("queueId", "==", queueId)
      .where("active", "==", true);

    if (judgeId) {
      assignmentsQuery = assignmentsQuery.where("judgeId", "==", judgeId);
    }

    const assignmentsSnap = await assignmentsQuery.get();
    if (assignmentsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "No active judge assignments found for this queue"
      );
    }

    // Collect unique judge IDs and fetch them
    const judgeIds = [
      ...new Set(assignmentsSnap.docs.map((d) => d.data().judgeId)),
    ];
    const judgeMap = new Map<
      string,
      { name: string; systemPrompt: string; targetModel: string }
    >();
    for (const jId of judgeIds) {
      const judgeDoc = await firestore.doc(`judges/${jId}`).get();
      if (judgeDoc.exists) {
        const data = judgeDoc.data()!;
        judgeMap.set(jId, {
          name: data.name,
          systemPrompt: data.systemPrompt,
          targetModel: data.targetModel,
        });
      }
    }

    // Fetch API keys
    const apiKeysDoc = await firestore.doc("apiKeys/default").get();
    const apiKeys = apiKeysDoc.exists ? apiKeysDoc.data()! : {};

    // Build (judge, question) pairs to evaluate
    const evalTasks: EvalTask[] = [];

    for (const assignDoc of assignmentsSnap.docs) {
      const assignment = assignDoc.data();
      const judge = judgeMap.get(assignment.judgeId);
      if (!judge) continue;

      if (assignment.questionId && assignment.submissionId) {
        // Specific question assignment
        const qDoc = await firestore
          .doc(
            `queues/${queueId}/submissions/${assignment.submissionId}/questions/${assignment.questionId}`
          )
          .get();
        if (qDoc.exists) {
          const qData = qDoc.data()!;
          evalTasks.push({
            judgeId: assignment.judgeId,
            judge,
            question: {
              id: qDoc.id,
              submissionId: assignment.submissionId,
              questionType: qData.questionType ?? "",
              questionText: qData.questionText ?? "",
              answer: qData.answer ?? {},
            },
          });
        }
      } else {
        // Queue-level assignment: get all questions across all submissions
        const submissionsSnap = await firestore
          .collection(`queues/${queueId}/submissions`)
          .get();

        for (const subDoc of submissionsSnap.docs) {
          const questionsSnap = await firestore
            .collection(
              `queues/${queueId}/submissions/${subDoc.id}/questions`
            )
            .get();

          for (const qDoc of questionsSnap.docs) {
            const qData = qDoc.data();
            evalTasks.push({
              judgeId: assignment.judgeId,
              judge,
              question: {
                id: qDoc.id,
                submissionId: subDoc.id,
                questionType: qData.questionType ?? "",
                questionText: qData.questionText ?? "",
                answer: qData.answer ?? {},
              },
            });
          }
        }
      }
    }

    // Deduplicate: same judge + same question in same submission
    const seen = new Set<string>();
    const uniqueTasks = evalTasks.filter((t) => {
      const key = `${t.judgeId}:${t.question.submissionId}:${t.question.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Create pending evaluation docs
    const evalDocs: Array<{ id: string; task: EvalTask }> = [];
    for (const task of uniqueTasks) {
      const ref = await firestore.collection("evaluations").add({
        judgeId: task.judgeId,
        judgeName: task.judge.name,
        queueId,
        queueName,
        submissionId: task.question.submissionId,
        questionId: task.question.id,
        questionText: task.question.questionText,
        targetModel: task.judge.targetModel,
        verdict: "inconclusive",
        reasoning: "",
        status: "pending",
        errorMessage: null,
        durationMs: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null,
      });
      evalDocs.push({ id: ref.id, task });
    }

    // Process with concurrency limit of 5
    const { succeeded, failed } = await processWithConcurrency(
      evalDocs,
      async ({ id, task }) => {
        const evalRef = firestore.doc(`evaluations/${id}`);
        await evalRef.update({ status: "running" });

        const { provider, model, providerName } = getProvider(
          task.judge.targetModel
        );
        const apiKey = apiKeys[providerName];

        if (!apiKey) {
          await evalRef.update({
            status: "failed",
            errorMessage: `No API key configured for ${providerName}`,
          });
          throw new Error(`No API key for ${providerName}`);
        }

        const startTime = Date.now();

        try {
          const { systemPrompt, userPrompt } = buildEvaluationPrompt(
            task.judge.systemPrompt,
            task.question
          );

          const response = await provider.generateText({
            systemPrompt,
            userPrompt,
            apiKey,
            model,
          });

          const parsed = parseEvaluationResponse(response.text);
          const durationMs = Date.now() - startTime;

          await evalRef.update({
            verdict: parsed.verdict,
            reasoning: parsed.reasoning,
            status: "completed",
            durationMs,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (error: unknown) {
          const durationMs = Date.now() - startTime;
          const errMsg =
            error instanceof Error ? error.message : "Unknown error";
          await evalRef.update({
            status: "failed",
            errorMessage: errMsg,
            durationMs,
          });
          throw error;
        }
      },
      5
    );

    return {
      total: uniqueTasks.length,
      succeeded,
      failed,
      evaluationIds: evalDocs.map((d) => d.id),
    };
  }
);
