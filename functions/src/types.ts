import { z } from "zod";

export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "single_choice", "free_form"]),
  text: z.string(),
  options: z.array(z.string()).optional().default([]),
  answer: z.union([z.string(), z.array(z.string())]),
});

export const SubmissionSchema = z.object({
  id: z.string(),
  subject: z.record(z.unknown()).optional().default({}),
  questions: z.array(QuestionSchema),
});

export const QueueSchema = z.object({
  id: z.string(),
  name: z.string(),
  submissions: z.array(SubmissionSchema),
});

export const UploadInputSchema = z.object({
  queues: z.array(QueueSchema),
});

export type QuestionInput = z.infer<typeof QuestionSchema>;
export type SubmissionInput = z.infer<typeof SubmissionSchema>;
export type QueueInput = z.infer<typeof QueueSchema>;

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
