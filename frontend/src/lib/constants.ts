export const LLM_PROVIDERS = [
  {
    provider: "openai" as const,
    label: "OpenAI",
    models: [
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo" },
    ],
  },
  {
    provider: "anthropic" as const,
    label: "Anthropic",
    models: [
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "anthropic/claude-haiku-35-20250620", name: "Claude Haiku 3.5" },
    ],
  },
  {
    provider: "google" as const,
    label: "Google",
    models: [
      { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    ],
  },
] as const;

export const ALL_MODELS = LLM_PROVIDERS.flatMap((p) => [...p.models]);

export const VERDICT_COLORS = {
  pass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  fail: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  inconclusive:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
} as const;
