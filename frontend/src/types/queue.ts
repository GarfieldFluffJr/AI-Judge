// Shape of the actual JSON input file
export interface SubmissionInput {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number; // unix ms
  questions: Array<{
    rev: number;
    data: {
      id: string;
      questionType: string;
      questionText: string;
    };
  }>;
  answers: Record<
    string,
    {
      choice?: string;
      reasoning?: string;
      [key: string]: unknown;
    }
  >;
}

// Firestore documents
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
  labelingTaskId: string;
  createdAt: Date;
  questionCount: number;
}

export interface Question {
  id: string;
  queueId: string;
  submissionId: string;
  questionType: string;
  questionText: string;
  rev: number;
  answer: Record<string, unknown>;
}
