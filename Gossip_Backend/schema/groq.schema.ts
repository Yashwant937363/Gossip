import * as z from "zod";

// ========================
// 1. Image Analysis Schema
// ========================
export const imageAnalysisSchema = z.object({
  title: z.string(),
  description: z.string(),
  details: z.array(z.string()),
  mood: z.string().default(""),
});

export type ImageAnalysisResult = z.infer<typeof imageAnalysisSchema>;

// ========================
// 2. Translation Schema (Unified)
// ========================

export const translatedMessageItemSchema = z.object({
  id: z.string(),
  translatedText: z.string(),
});

export type TranslatedMessageItem = z.infer<typeof translatedMessageItemSchema>;

export const translateMessagesResponseSchema = z.object({
  messages: z.array(translatedMessageItemSchema),
  language: z.string(),
});

export type TranslateMessagesResult = z.infer<
  typeof translateMessagesResponseSchema
>;

// ========================
// 3. Summarization Schemas
// ========================

export const bulletSummarySchema = z.object({
  summary: z.array(z.string()),
});

export const paragraphSummarySchema = z.object({
  summary: z.string(),
});

export const structuredSummarySchema = z.object({
  summary: z.object({
    topic: z.string(),
    keyPoints: z.array(z.string()),
    conclusion: z.string(),
  }),
});

export type BulletSummaryResult = z.infer<typeof bulletSummarySchema>;
export type ParagraphSummaryResult = z.infer<typeof paragraphSummarySchema>;
export type StructuredSummaryResult = z.infer<typeof structuredSummarySchema>;

export type SummarizationResult =
  | BulletSummaryResult
  | ParagraphSummaryResult
  | StructuredSummaryResult;
