import Anthropic from "@anthropic-ai/sdk";
import { LlmProvider, LlmResponse } from "../types";

export class AnthropicProvider implements LlmProvider {
  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model: string;
  }): Promise<LlmResponse> {
    const client = new Anthropic({ apiKey: params.apiKey });
    const response = await client.messages.create({
      model: params.model,
      max_tokens: 2048,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      tokenUsage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
  }
}
