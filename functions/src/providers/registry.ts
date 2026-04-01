import { LlmProvider } from "../types";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";

const providers: Record<string, LlmProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  google: new GeminiProvider(),
};

export function getProvider(targetModel: string): {
  provider: LlmProvider;
  model: string;
  providerName: string;
} {
  const slashIndex = targetModel.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(`Invalid target model format: ${targetModel}. Expected "provider/model".`);
  }
  const providerName = targetModel.substring(0, slashIndex);
  const model = targetModel.substring(slashIndex + 1);

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}. Supported: ${Object.keys(providers).join(", ")}`);
  }

  return { provider, model, providerName };
}
