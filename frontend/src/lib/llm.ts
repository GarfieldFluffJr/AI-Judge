/**
 * JSON schema for structured LLM responses.
 * Used by Gemini's response_schema and OpenAI's response_format.
 * Matches what the system prompt asks for in evaluationRunner.ts.
 */
export const EVALUATION_RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    verdict: {
      type: "string" as const,
      enum: ["pass", "fail", "inconclusive"],
    },
    reasoning: {
      type: "string" as const,
    },
  },
  required: ["verdict", "reasoning"],
  additionalProperties: false,
};

export interface EvaluationResponse {
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
}

interface LlmResult {
  text: string;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evaluation",
          strict: true,
          schema: EVALUATION_RESPONSE_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content ?? "" };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return { text: text ?? "" };
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: EVALUATION_RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text };
}

export async function callLlm(
  targetModel: string,
  apiKeys: { openai: string; anthropic: string; google: string },
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const slashIndex = targetModel.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(`Invalid model format: ${targetModel}`);
  }

  const provider = targetModel.substring(0, slashIndex);
  const model = targetModel.substring(slashIndex + 1);

  switch (provider) {
    case "openai": {
      if (!apiKeys.openai) throw new Error("No OpenAI API key configured");
      const result = await callOpenAI(
        apiKeys.openai,
        model,
        systemPrompt,
        userPrompt,
      );
      return result.text;
    }
    case "anthropic": {
      if (!apiKeys.anthropic)
        throw new Error("No Anthropic API key configured");
      const result = await callAnthropic(
        apiKeys.anthropic,
        model,
        systemPrompt,
        userPrompt,
      );
      return result.text;
    }
    case "google": {
      if (!apiKeys.google) throw new Error("No Google API key configured");
      const result = await callGemini(
        apiKeys.google,
        model,
        systemPrompt,
        userPrompt,
      );
      return result.text;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
