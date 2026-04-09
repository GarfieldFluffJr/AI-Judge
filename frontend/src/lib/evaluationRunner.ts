import {
  fetchAssignments,
  fetchSubmissions,
  fetchQuestions,
  fetchApiKeys,
  createEvaluationRecord,
  updateEvaluation,
} from "./firestore";
import { callLlm } from "./llm";
import type { Judge } from "@/types/judge";
import type { Question } from "@/types/queue";

function buildPrompt(
  judgeSystemPrompt: string,
  question: Question
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an AI judge evaluating answers to questions. Your evaluation rubric is as follows:

${judgeSystemPrompt}

You MUST respond with valid JSON in this exact format and nothing else:
{
  "verdict": "pass" | "fail" | "inconclusive",
  "reasoning": "<your detailed reasoning for this verdict>"
}

Rules:
- "pass" means the answer meets the rubric criteria
- "fail" means the answer does not meet the rubric criteria
- "inconclusive" means you cannot determine with confidence
- Keep reasoning concise but specific (2-4 sentences)
- Respond ONLY with the JSON object, no other text`;

  let userPrompt = `Question Type: ${question.questionType}\n`;
  userPrompt += `Question: ${question.questionText}\n\n`;
  userPrompt += `Answer:\n`;
  for (const [key, value] of Object.entries(question.answer)) {
    userPrompt += `  ${key}: ${value}\n`;
  }
  userPrompt += `\nEvaluate this answer according to your rubric. Respond with JSON only.`;

  return { systemPrompt, userPrompt };
}

function parseResponse(raw: string): {
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
} {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      verdict: "inconclusive",
      reasoning: `Could not parse JSON from response: ${raw.substring(0, 300)}`,
    };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const valid = ["pass", "fail", "inconclusive"];
    return {
      verdict: valid.includes(parsed.verdict) ? parsed.verdict : "inconclusive",
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return {
      verdict: "inconclusive",
      reasoning: `JSON parse error. Raw: ${raw.substring(0, 300)}`,
    };
  }
}

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
}

export async function runBatchEvaluation(
  queueId: string,
  queueName: string,
  judges: Judge[],
  onProgress?: (completed: number, total: number) => void
): Promise<BatchResult> {
  // Fetch everything we need
  const [assignments, submissions, apiKeys] = await Promise.all([
    fetchAssignments(queueId),
    fetchSubmissions(queueId),
    fetchApiKeys(),
  ]);

  if (assignments.length === 0) {
    throw new Error("No judges assigned to this queue");
  }

  // Build judge lookup
  const judgeMap = new Map(judges.map((j) => [j.id, j]));

  // Collect all (judge, question) pairs
  type EvalTask = {
    judge: Judge;
    question: Question;
  };
  const tasks: EvalTask[] = [];

  for (const assignment of assignments) {
    const judge = judgeMap.get(assignment.judgeId);
    if (!judge) continue;

    if (assignment.questionId && assignment.submissionId) {
      // Specific question
      const questions = await fetchQuestions(queueId, assignment.submissionId);
      const q = questions.find((q) => q.id === assignment.questionId);
      if (q) tasks.push({ judge, question: q });
    } else {
      // Queue-level: all questions in all submissions
      for (const sub of submissions) {
        const questions = await fetchQuestions(queueId, sub.id);
        for (const q of questions) {
          tasks.push({ judge, question: q });
        }
      }
    }
  }

  // Deduplicate by judge + submission + question
  const seen = new Set<string>();
  const uniqueTasks = tasks.filter((t) => {
    const key = `${t.judge.id}:${t.question.submissionId}:${t.question.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Create pending evaluation records
  const evalRecords: Array<{ id: string; task: EvalTask }> = [];
  for (const task of uniqueTasks) {
    const id = await createEvaluationRecord({
      judgeId: task.judge.id,
      judgeName: task.judge.name,
      queueId,
      queueName,
      submissionId: task.question.submissionId,
      questionId: task.question.id,
      questionText: task.question.questionText,
      targetModel: task.judge.targetModel,
    });
    evalRecords.push({ id, task });
  }

  // Process with concurrency limit of 3 (browser-friendly)
  let succeeded = 0;
  let failed = 0;
  let completed = 0;
  const concurrency = 3;
  const executing = new Set<Promise<void>>();

  for (const { id, task } of evalRecords) {
    const p = (async () => {
      await updateEvaluation(id, { status: "running" } as Partial<import("@/types/evaluation").Evaluation>);
      const startTime = Date.now();

      try {
        const { systemPrompt, userPrompt } = buildPrompt(
          task.judge.systemPrompt,
          task.question
        );

        const raw = await callLlm(
          task.judge.targetModel,
          apiKeys,
          systemPrompt,
          userPrompt
        );

        const parsed = parseResponse(raw);
        const durationMs = Date.now() - startTime;

        await updateEvaluation(id, {
          verdict: parsed.verdict,
          reasoning: parsed.reasoning,
          status: "completed",
          durationMs,
        } as Partial<import("@/types/evaluation").Evaluation>);
        succeeded++;
      } catch (error: unknown) {
        const durationMs = Date.now() - startTime;
        const errMsg =
          error instanceof Error ? error.message : "Unknown error";
        await updateEvaluation(id, {
          status: "failed",
          errorMessage: errMsg,
          durationMs,
        } as Partial<import("@/types/evaluation").Evaluation>);
        failed++;
      }

      completed++;
      onProgress?.(completed, evalRecords.length);
    })();

    const tracked: Promise<void> = p.then(() => { executing.delete(tracked); });
    executing.add(tracked);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  return { total: uniqueTasks.length, succeeded, failed };
}
