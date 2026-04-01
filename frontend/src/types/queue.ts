export interface QueueInput {
  id: string;
  name: string;
  submissions: SubmissionInput[];
}

export interface SubmissionInput {
  id: string;
  subject: Record<string, unknown>;
  questions: QuestionInput[];
}

export interface QuestionInput {
  id: string;
  type: "multiple_choice" | "single_choice" | "free_form";
  text: string;
  options?: string[];
  answer: string | string[];
}

export interface Queue {
  id: string;
  name: string;
  submissionCount: number;
  questionCount: number;
  uploadedAt: Date;
}

export interface Submission {
  id: string;
  queueId: string;
  subject: Record<string, unknown>;
  questionCount: number;
}

export interface Question {
  id: string;
  queueId: string;
  submissionId: string;
  type: "multiple_choice" | "single_choice" | "free_form";
  text: string;
  options: string[];
  answer: string | string[];
}
