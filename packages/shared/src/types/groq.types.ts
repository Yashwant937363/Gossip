import { SummarizationFormat } from "../schemas/settings.schema";

export const ToneValues = [
  "normal",
  "friendly",
  "formal",
  "sarcastic",
  "compassionate",
  "humorous",
] as const;

export type Tone = (typeof ToneValues)[number];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AnalyzeImageInput {
  url: string;
  prompt?: string;
}

export interface ChatbotResult {
  reply: string;
  tone: Tone;
}

export interface ChatbotInput {
  message: string;
  tone?: Tone;
  sessionId?: string;
  history?: ChatMessage[];
}

export interface MessageToTranslate {
  id: string;
  text: string;
}
export interface TranslateMessagesInput {
  messages: MessageToTranslate[];
  to: string;
}

export interface ConversationTurn {
  username: string;
  message: string;
}

export interface SummarizationInput {
  conversation: ConversationTurn[];
  format?: SummarizationFormat;
}
