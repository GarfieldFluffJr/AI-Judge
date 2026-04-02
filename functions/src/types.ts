import { z } from "zod";

export const QuestionDataSchema = z.object({
  id: z.string(),
  questionType: z.string(),
  questionText: z.string(),
});

export const QuestionSchema = z.object({
  rev: z.number(),
  data: QuestionDataSchema,
});

export const AnswerSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown())
);

export const SubmissionSchema = z.object({
  id: z.string(),
  queueId: z.string(),
  labelingTaskId: z.string(),
  createdAt: z.number(),
  questions: z.array(QuestionSchema),
  answers: AnswerSchema,
});

export const UploadInputSchema = z.array(SubmissionSchema);

export type SubmissionInput = z.infer<typeof SubmissionSchema>;

export interface LlmResponse {
  text: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LlmProvider {
  generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model: string;
  }): Promise<LlmResponse>;
}

export type Verdict = "pass" | "fail" | "inconclusive";

export interface ParsedEvaluation {
  verdict: Verdict;
  reasoning: string;
}
