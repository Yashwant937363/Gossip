export type Tone =
  | "normal"
  | "friendly"
  | "formal"
  | "sarcastic"
  | "compassionate"
  | "humorous";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AnalyzeImageInput {
  url: string;
  prompt?: string;
}
