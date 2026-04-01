export interface Assignment {
  id: string;
  judgeId: string;
  judgeName: string;
  queueId: string;
  questionId: string | null;
  submissionId: string | null;
  active: boolean;
  createdAt: Date;
}
