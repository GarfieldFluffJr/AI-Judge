import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  type Timestamp,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Queue, Submission, Question, SubmissionInput } from "@/types/queue";
import type { Judge, JudgeFormData } from "@/types/judge";
import type { Assignment } from "@/types/assignment";
import type { Evaluation, EvaluationFilters } from "@/types/evaluation";
import type { ApiKeys, Provider } from "@/types/api-keys";

function toDate(ts: Timestamp | Date | undefined): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
}

// ---- Queues ----

export async function fetchQueues(): Promise<Queue[]> {
  const snap = await getDocs(
    query(collection(db, "queues"), orderBy("uploadedAt", "desc"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      submissionCount: data.submissionCount ?? 0,
      questionCount: data.questionCount ?? 0,
      uploadedAt: toDate(data.uploadedAt),
    };
  });
}

export async function deleteQueue(queueId: string): Promise<void> {
  // Delete all questions in all submissions first
  const subsSnap = await getDocs(
    collection(db, "queues", queueId, "submissions")
  );
  for (const subDoc of subsSnap.docs) {
    const questionsSnap = await getDocs(
      collection(db, "queues", queueId, "submissions", subDoc.id, "questions")
    );
    const batch = writeBatch(db);
    for (const qDoc of questionsSnap.docs) {
      batch.delete(qDoc.ref);
    }
    batch.delete(subDoc.ref);
    await batch.commit();
  }
  await deleteDoc(doc(db, "queues", queueId));
}

export async function fetchQueue(queueId: string): Promise<Queue> {
  const d = await getDoc(doc(db, "queues", queueId));
  const data = d.data()!;
  return {
    id: d.id,
    name: data.name,
    submissionCount: data.submissionCount ?? 0,
    questionCount: data.questionCount ?? 0,
    uploadedAt: toDate(data.uploadedAt),
  };
}

export async function fetchSubmissions(queueId: string): Promise<Submission[]> {
  const snap = await getDocs(
    collection(db, "queues", queueId, "submissions")
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      queueId,
      labelingTaskId: data.labelingTaskId ?? "",
      createdAt: data.createdAt
        ? new Date(data.createdAt)
        : toDate(data.uploadedAt),
      questionCount: data.questionCount ?? 0,
    };
  });
}

export async function fetchQuestions(
  queueId: string,
  submissionId: string
): Promise<Question[]> {
  const snap = await getDocs(
    collection(db, "queues", queueId, "submissions", submissionId, "questions")
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      queueId,
      submissionId,
      questionType: data.questionType ?? "",
      questionText: data.questionText ?? "",
      rev: data.rev ?? 1,
      answer: data.answer ?? {},
    };
  });
}

/**
 * Accepts the real input format: a flat array of submissions.
 * Groups by queueId, creates queue docs, and persists submissions + questions.
 */
export async function uploadSubmissions(
  submissions: SubmissionInput[]
): Promise<string[]> {
  // Group submissions by queueId
  const byQueue = new Map<string, SubmissionInput[]>();
  for (const sub of submissions) {
    const qId = sub.queueId;
    if (!byQueue.has(qId)) byQueue.set(qId, []);
    byQueue.get(qId)!.push(sub);
  }

  const queueIds: string[] = [];

  for (const [queueId, queueSubs] of byQueue) {
    const batch = writeBatch(db);
    let totalQuestions = 0;

    const queueRef = doc(db, "queues", queueId);
    batch.set(queueRef, {
      name: queueId,
      submissionCount: queueSubs.length,
      questionCount: 0,
      uploadedAt: serverTimestamp(),
    });

    for (const sub of queueSubs) {
      const subRef = doc(db, "queues", queueId, "submissions", sub.id);
      batch.set(subRef, {
        labelingTaskId: sub.labelingTaskId,
        createdAt: sub.createdAt,
        questionCount: sub.questions.length,
      });

      for (const q of sub.questions) {
        const questionId = q.data.id;
        const answer = sub.answers[questionId] ?? {};
        const qRef = doc(
          db,
          "queues",
          queueId,
          "submissions",
          sub.id,
          "questions",
          questionId
        );
        batch.set(qRef, {
          questionType: q.data.questionType,
          questionText: q.data.questionText,
          rev: q.rev,
          answer,
          queueId,
          submissionId: sub.id,
        });
        totalQuestions++;
      }
    }

    await batch.commit();
    await updateDoc(queueRef, { questionCount: totalQuestions });
    queueIds.push(queueId);
  }

  return queueIds;
}

// ---- Judges ----

export async function fetchJudges(): Promise<Judge[]> {
  const snap = await getDocs(
    query(collection(db, "judges"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      systemPrompt: data.systemPrompt,
      targetModel: data.targetModel,
      active: data.active ?? true,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  });
}

export async function createJudge(data: JudgeFormData): Promise<string> {
  const ref = await addDoc(collection(db, "judges"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateJudge(
  id: string,
  data: Partial<JudgeFormData>
): Promise<void> {
  await updateDoc(doc(db, "judges", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJudge(id: string): Promise<void> {
  await deleteDoc(doc(db, "judges", id));
}

// ---- Assignments ----

export async function fetchAssignments(queueId: string): Promise<Assignment[]> {
  const snap = await getDocs(
    query(
      collection(db, "assignments"),
      where("queueId", "==", queueId),
      where("active", "==", true)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      judgeId: data.judgeId,
      judgeName: data.judgeName,
      queueId: data.queueId,
      questionId: data.questionId ?? null,
      submissionId: data.submissionId ?? null,
      active: data.active,
      createdAt: toDate(data.createdAt),
    };
  });
}

export async function createAssignment(data: {
  judgeId: string;
  judgeName: string;
  queueId: string;
  questionId: string | null;
  submissionId: string | null;
}): Promise<string> {
  const ref = await addDoc(collection(db, "assignments"), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeAssignment(id: string): Promise<void> {
  await updateDoc(doc(db, "assignments", id), { active: false });
}

// ---- Evaluations ----

export async function fetchEvaluations(
  filters: EvaluationFilters = {}
): Promise<Evaluation[]> {
  let q = query(
    collection(db, "evaluations"),
    orderBy("createdAt", "desc")
  );

  if (filters.queueId) {
    q = query(q, where("queueId", "==", filters.queueId));
  }

  const snap = await getDocs(q);
  let results = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      judgeId: data.judgeId,
      judgeName: data.judgeName,
      queueId: data.queueId,
      queueName: data.queueName ?? "",
      submissionId: data.submissionId,
      questionId: data.questionId,
      questionText: data.questionText,
      targetModel: data.targetModel,
      verdict: data.verdict,
      reasoning: data.reasoning ?? "",
      status: data.status,
      errorMessage: data.errorMessage ?? null,
      durationMs: data.durationMs ?? null,
      createdAt: toDate(data.createdAt),
      completedAt: data.completedAt ? toDate(data.completedAt) : null,
    } as Evaluation;
  });

  // Client-side filtering for multi-select filters
  if (filters.judgeIds?.length) {
    results = results.filter((e) => filters.judgeIds!.includes(e.judgeId));
  }
  if (filters.questionIds?.length) {
    results = results.filter((e) => filters.questionIds!.includes(e.questionId));
  }
  if (filters.verdicts?.length) {
    results = results.filter((e) => filters.verdicts!.includes(e.verdict));
  }

  return results;
}

export async function createEvaluationRecord(data: {
  judgeId: string;
  judgeName: string;
  queueId: string;
  queueName: string;
  submissionId: string;
  questionId: string;
  questionText: string;
  targetModel: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "evaluations"), {
    ...data,
    verdict: "inconclusive",
    reasoning: "",
    status: "pending",
    errorMessage: null,
    durationMs: null,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

export async function updateEvaluation(
  id: string,
  data: Partial<Evaluation>
): Promise<void> {
  await updateDoc(doc(db, "evaluations", id), data);
}

// ---- API Keys ----

const API_KEYS_DOC = "default";

export async function fetchApiKeys(): Promise<ApiKeys> {
  const d = await getDoc(doc(db, "apiKeys", API_KEYS_DOC));
  if (!d.exists()) {
    return { openai: "", anthropic: "", google: "" };
  }
  const data = d.data();
  return {
    openai: data.openai ?? "",
    anthropic: data.anthropic ?? "",
    google: data.google ?? "",
  };
}

export async function saveApiKey(
  provider: Provider,
  key: string
): Promise<void> {
  await setDoc(
    doc(db, "apiKeys", API_KEYS_DOC),
    { [provider]: key, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
