import OpenAI from "openai";
import { LlmProvider, LlmResponse } from "../types";

export class OpenAIProvider implements LlmProvider {
  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model: string;
  }): Promise<LlmResponse> {
    const client = new OpenAI({ apiKey: params.apiKey });
    const response = await client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      tokenUsage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
