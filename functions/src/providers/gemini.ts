import { GoogleGenerativeAI } from "@google/generative-ai";
import { LlmProvider, LlmResponse } from "../types";

export class GeminiProvider implements LlmProvider {
  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    apiKey: string;
    model: string;
  }): Promise<LlmResponse> {
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const model = genAI.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
    });

    const result = await model.generateContent(params.userPrompt);
    const response = result.response;

    return {
      text: response.text(),
      tokenUsage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
