/**
 * Helper to safely parse JSON from model responses.
 * Handles:
 * - Direct valid JSON
 * - Model reasoning blocks (e.g. <think>...</think>)
 * - Markdown code blocks (```json ... ``` or ``` ... ```) even with conversational preambles/postambles
 * - Raw JSON objects or arrays surrounded by explanatory conversational text
 */
export function safeParseJson(content: string): any {
  if (!content.trim()) {
    throw new Error("Empty response received from Groq AI model");
  }

  const trimmed = content.trim();

  // 1. Direct JSON parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to extraction strategies
  }

  // 2. Strip reasoning/thought tags (<think>...</think>) if present
  let sanitized = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 3. Extract from markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  const codeBlockMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // If parsing fails, fall back to searching within the extracted block or sanitized text
      sanitized = codeBlockMatch[1].trim();
    }
  }

  // 4. Extract outer JSON object or array by finding boundary brackets/braces
  const firstBrace = sanitized.indexOf("{");
  const firstBracket = sanitized.indexOf("[");

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = sanitized.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = sanitized.lastIndexOf("]");
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const candidate = sanitized.slice(startIndex, endIndex + 1);
    try {
      return JSON.parse(candidate);
    } catch (err) {
      throw new Error(
        `Failed to parse extracted JSON from model response: ${(err as Error).message}`,
      );
    }
  }

  throw new Error("No valid JSON structure found in AI response");
}
