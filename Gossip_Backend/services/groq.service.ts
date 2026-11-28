import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions.js";
import groq, { GROQ_MODELS } from "../config/groq.js";
import { env } from "../config/env.js";
import { simulateMockLatency } from "../utils/mock-delay.js";
import ANALYZE_IMAGE_SYSTEM_PROMPT from "../prompts/analyze-image.prompt.js";
import {
  human_behavior_message,
  tone_templates,
} from "../prompts/chatbot.prompt.js";
import input_system_prompt, {
  output_bullet_points,
  output_paragraph,
  output_structured,
} from "../prompts/summarization.prompt.js";
import TRANSLATE_CHAT_SYSTEM_PROMPT from "../prompts/translate-chat.prompt.js";
import {
  bulletSummarySchema,
  imageAnalysisSchema,
  paragraphSummarySchema,
  structuredSummarySchema,
  translateMessagesResponseSchema,
  TranslateMessagesResult,
  ImageAnalysisResult,
  SummarizationResult,
  AnalyzeImageInput,
  ChatbotInput,
  ChatbotResult,
  Tone,
  TranslateMessagesInput,
  SummarizationFormat,
  SummarizationInput,
} from "@gossip/shared";
import { safeParseJson } from "../utils/safe-parse-json.js";
import { validateImageUrl } from "../utils/validate-image-url.js";
import { GroqServiceError } from "../errors/index.js";

/**
 * Type definition for Groq chat completion runner.
 * Takes parameters and returns the string text response.
 */
export type GroqRunner = (
  params: ChatCompletionCreateParamsNonStreaming,
) => Promise<string>;

/**
 * Mock Groq runner used when MOCK_AI=true for load testing without external API calls.
 */
export async function mockGroqChat(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<string> {
  await simulateMockLatency(env.mockAiLatencyMs);

  const systemMsg = params.messages.find((m) => m.role === "system");
  const systemContent =
    typeof systemMsg?.content === "string" ? systemMsg.content : "";
  const userMsg = [...params.messages].reverse().find((m) => m.role === "user");
  const userContent =
    typeof userMsg?.content === "string" ? userMsg.content : "";

  if (params.response_format?.type === "json_object") {
    if (systemContent.includes(TRANSLATE_CHAT_SYSTEM_PROMPT)) {
      const parsed = JSON.parse(userContent) as TranslateMessagesInput;
      return JSON.stringify({
        messages: (parsed.messages || []).map((m) => ({
          id: m.id,
          translatedText: `[mock-${parsed.to}] ${m.text}`,
        })),
        language: parsed.to,
      });
    }

    if (systemContent.includes(ANALYZE_IMAGE_SYSTEM_PROMPT)) {
      return JSON.stringify({
        title: "Mock Image Analysis",
        description: "A mock image description generated during load testing.",
        details: ["Mock visual detail 1", "Mock visual detail 2"],
        mood: "Neutral",
      });
    }

    if (systemContent.includes(output_bullet_points)) {
      return JSON.stringify({
        summary: ["Mock summary point 1.", "Mock summary point 2."],
      });
    }

    if (systemContent.includes(output_structured)) {
      return JSON.stringify({
        summary: {
          topic: "Mock Conversation Topic",
          keyPoints: ["Mock key point 1", "Mock key point 2"],
          conclusion: "Mock conclusion.",
        },
      });
    }

    return JSON.stringify({
      summary: "This is a mock paragraph summary generated during load testing.",
    });
  }

  return "This is a mock chatbot response generated during load testing.";
}

/**
 * Default production runner that executes the call using the real Groq client.
 */
export async function executeGroqChat(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<string> {
  if (env.mockAi) {
    return mockGroqChat(params);
  }

  try {
    const response = await groq.chat.completions.create(params);
    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    throw new GroqServiceError(
      error?.message || "Groq AI service request failed",
      error,
    );
  }
}

/**
 * 1. Image Analysis using Qwen 3.8 Multimodal Vision
 * Model: qwen/qwen3.8-27b
 */
export async function analyzeImage(
  input: AnalyzeImageInput,
  runner: GroqRunner = executeGroqChat,
): Promise<ImageAnalysisResult> {
  await validateImageUrl(input.url);

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text:
        input.prompt ||
        "Analyze this image and return the JSON structure as instructed.",
    },
    {
      type: "image_url",
      image_url: {
        url: input.url,
      },
    },
  ];

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: ANALYZE_IMAGE_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: userContent,
    },
  ];

  const content = await runner({
    model: GROQ_MODELS.VISION,
    messages,
    response_format: { type: "json_object" },
  });

  const parsed = safeParseJson(content);
  return imageAnalysisSchema.parse(parsed);
}

/**
 * 2. Conversational Chatbot using GPT-OSS 120B
 * Model: openai/gpt-oss-120b
 */
export async function generateChatbotReply(
  input: ChatbotInput,
  runner: GroqRunner = executeGroqChat,
): Promise<ChatbotResult> {
  const selectedTone: Tone = input.tone || "normal";
  const toneInstruction = tone_templates[selectedTone] || tone_templates.normal;

  const systemContent = `${human_behavior_message}\n\nTone instruction: ${toneInstruction}`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemContent,
    },
  ];

  if (input.history && input.history.length > 0) {
    for (const msg of input.history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: input.message,
  });

  const reply = await runner({
    model: GROQ_MODELS.DEFAULT,
    messages,
  });

  return {
    reply,
    tone: selectedTone,
  };
}

/**
 * 3. Unified Message Translation using GPT-OSS 120B
 * Model: openai/gpt-oss-120b
 * Handles both single and multiple message translations.
 */
export async function translateMessages(
  input: TranslateMessagesInput,
  runner: GroqRunner = executeGroqChat,
): Promise<TranslateMessagesResult> {
  if (!input.messages || input.messages.length === 0) {
    return {
      messages: [],
      language: input.to,
    };
  }

  const payload = {
    messages: input.messages,
    to: input.to,
  };

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: TRANSLATE_CHAT_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];

  const content = await runner({
    model: GROQ_MODELS.DEFAULT,
    messages,
    response_format: { type: "json_object" },
  });

  const parsed = safeParseJson(content);
  return translateMessagesResponseSchema.parse(parsed);
}

/**
 * 4. Conversation Summarization using GPT-OSS 120B
 * Model: openai/gpt-oss-120b
 * Formats: "bullet" | "paragraph" | "structured"
 */
export async function summarizeConversation(
  input: SummarizationInput,
  runner: GroqRunner = executeGroqChat,
): Promise<SummarizationResult> {
  const format: SummarizationFormat = input.format || "paragraph";

  let formatPrompt: string;
  switch (format) {
    case "bullet":
      formatPrompt = output_bullet_points;
      break;
    case "structured":
      formatPrompt = output_structured;
      break;
    case "paragraph":
    default:
      formatPrompt = output_paragraph;
      break;
  }

  const systemContent = `${input_system_prompt}\n\n${formatPrompt}`;

  const payload = {
    conversation: input.conversation,
  };

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];

  const content = await runner({
    model: GROQ_MODELS.DEFAULT,
    messages,
    response_format: { type: "json_object" },
  });

  const parsed = safeParseJson(content);

  switch (format) {
    case "bullet":
      return bulletSummarySchema.parse(parsed);
    case "structured":
      return structuredSummarySchema.parse(parsed);
    case "paragraph":
    default:
      return paragraphSummarySchema.parse(parsed);
  }
}
