import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import groq from "../config/groq.js";
import {
  analyzeImage,
  generateChatbotReply,
  summarizeConversation,
  translateMessages,
} from "./groq.service.js";

vi.mock("../config/groq.js", () => ({
  GROQ_MODELS: {
    VISION: "qwen/qwen3.8-27b",
    DEFAULT: "openai/gpt-oss-120b",
  },
  default: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe("Groq AI mock mode (MOCK_AI=true)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.mockAi = true;
    env.mockAiLatencyMs = 0;
  });

  afterEach(() => {
    env.mockAi = false;
  });

  it("returns a mock chatbot reply without calling Groq", async () => {
    const res = await generateChatbotReply({
      message: "Hello!",
      tone: "friendly",
    });

    expect(groq.chat.completions.create).not.toHaveBeenCalled();
    expect(res.tone).toBe("friendly");
    expect(typeof res.reply).toBe("string");
    expect(res.reply.length).toBeGreaterThan(0);
  });

  it("returns schema-valid translations echoing input message IDs", async () => {
    const res = await translateMessages({
      messages: [
        { id: "m1", text: "Hello" },
        { id: "m2", text: "How are you?" },
      ],
      to: "spanish",
    });

    expect(groq.chat.completions.create).not.toHaveBeenCalled();
    expect(res.language).toBe("spanish");
    expect(res.messages).toEqual([
      { id: "m1", translatedText: "[mock-spanish] Hello" },
      { id: "m2", translatedText: "[mock-spanish] How are you?" },
    ]);
  });

  it("returns schema-valid summaries for paragraph, bullet, and structured formats", async () => {
    const conversation = [
      { username: "Alice", message: "Deploy at 9 AM?" },
      { username: "Bob", message: "Sounds good." },
    ];

    const paragraph = await summarizeConversation({
      conversation,
      format: "paragraph",
    });
    const bullet = await summarizeConversation({
      conversation,
      format: "bullet",
    });
    const structured = await summarizeConversation({
      conversation,
      format: "structured",
    });

    expect(groq.chat.completions.create).not.toHaveBeenCalled();
    expect(typeof paragraph.summary).toBe("string");
    expect(Array.isArray(bullet.summary)).toBe(true);
    expect(structured.summary).toMatchObject({
      topic: expect.any(String),
      keyPoints: expect.any(Array),
      conclusion: expect.any(String),
    });
  });

  it("returns schema-valid image analysis and skips external HEAD fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const res = await analyzeImage({
        url: "https://example.com/sample.png",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(groq.chat.completions.create).not.toHaveBeenCalled();
      expect(res.title).toBe("Mock Image Analysis");
      expect(Array.isArray(res.details)).toBe(true);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
