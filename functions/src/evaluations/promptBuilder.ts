export function buildEvaluationPrompt(
  judgeSystemPrompt: string,
  question: {
    type: string;
    text: string;
    options: string[];
    answer: string | string[];
  }
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an AI judge evaluating answers to questions. Your evaluation rubric is as follows:

${judgeSystemPrompt}

You MUST respond with valid JSON in this exact format and nothing else:
{
  "verdict": "pass" | "fail" | "inconclusive",
  "reasoning": "<your detailed reasoning for this verdict>"
}

Rules:
- "pass" means the answer meets the rubric criteria
- "fail" means the answer does not meet the rubric criteria
- "inconclusive" means you cannot determine with confidence
- Keep reasoning concise but specific (2-4 sentences)
- Respond ONLY with the JSON object, no other text`;

  let userPrompt = `Question Type: ${question.type}\n`;
  userPrompt += `Question: ${question.text}\n`;

  if (question.options.length > 0) {
    userPrompt += `Options:\n${question.options.map((o, i) => `  ${i + 1}. ${o}`).join("\n")}\n`;
  }

  const answerStr = Array.isArray(question.answer)
    ? question.answer.join(", ")
    : question.answer;
  userPrompt += `\nAnswer Given: ${answerStr}\n`;
  userPrompt += `\nEvaluate this answer according to your rubric. Respond with JSON only.`;

  return { systemPrompt, userPrompt };
}

export function parseEvaluationResponse(raw: string): {
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
} {
  // Try to extract JSON from the response (handle markdown code fences)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      verdict: "inconclusive",
      reasoning: `Could not parse JSON from LLM response: ${raw.substring(0, 300)}`,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const validVerdicts = ["pass", "fail", "inconclusive"];
    return {
      verdict: validVerdicts.includes(parsed.verdict)
        ? parsed.verdict
        : "inconclusive",
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return {
      verdict: "inconclusive",
      reasoning: `JSON parse error. Raw response: ${raw.substring(0, 300)}`,
    };
  }
}
