export type Verdict = "pass" | "fail" | "inconclusive";

export type EvaluationStatus = "pending" | "running" | "completed" | "failed";

export interface Evaluation {
  id: string;
  judgeId: string;
  judgeName: string;
  queueId: string;
  queueName: string;
  submissionId: string;
  questionId: string;
  questionText: string;
  targetModel: string;
  verdict: Verdict;
  reasoning: string;
  status: EvaluationStatus;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface EvaluationFilters {
  queueId?: string;
  judgeIds?: string[];
  questionIds?: string[];
  verdicts?: Verdict[];
}

export interface EvaluationStats {
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  passRate: number;
}
