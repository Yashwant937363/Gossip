import dotenv from "dotenv";
dotenv.config();

interface ENV {
  port: number;
  jwtSecret: string;
  dbUrl: string;
  logLevel: string;
  aiServerUrl: string;
  email: string;
  appPassword: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  groqApiKey: string;
  groqDefaultModel: string;
  groqVisionModel: string;
  lokiUrl: string;
  lokiUsername: string;
  lokiToken: string;
  mockAi: boolean;
  mockAiLatencyMs: number;
  mockUpload: boolean;
  mockUploadLatencyMs: number;
}

function parseLatencyMs(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const env: ENV = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || "",
  dbUrl: process.env.DATABASE || "",
  logLevel: process.env.LOG_LEVEL || "debug",
  aiServerUrl: process.env.AIServerURL || "",
  email: process.env.Email || "",
  appPassword: process.env.AppPassword || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqDefaultModel: process.env.GROQ_DEFAULT_MODEL || "openai/gpt-oss-120b",
  groqVisionModel: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b",
  lokiUrl: process.env.LOKI_URL || "",
  lokiUsername: process.env.LOKI_USERNAME || "",
  lokiToken: process.env.LOKI_TOKEN || "",
  mockAi: process.env.MOCK_AI === "true",
  mockAiLatencyMs: parseLatencyMs(process.env.MOCK_AI_LATENCY_MS, 50),
  mockUpload: process.env.MOCK_UPLOAD === "true",
  mockUploadLatencyMs: parseLatencyMs(process.env.MOCK_UPLOAD_LATENCY_MS, 50),
};
