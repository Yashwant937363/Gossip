import { z } from "zod";

export const SUMMARIZATION_FORMATS = [
  "paragraph",
  "bullet",
  "structured",
] as const;

export const summarizationFormatSchema = z.enum(SUMMARIZATION_FORMATS);

export type SummarizationFormat = z.infer<typeof summarizationFormatSchema>;

export const summarizationSettingsSchema = z.object({
  format: summarizationFormatSchema.default("paragraph"),
});

export const translationSettingsSchema = z.object({
  language: z.string().default("original"),
  alwaysTranslate: z.boolean().default(false),
});

export const userSettingsSchema = z.object({
  translation: translationSettingsSchema,
  summarization: summarizationSettingsSchema,
});

export type TranslationSettings = z.infer<typeof translationSettingsSchema>;
export type SummarizationSettings = z.infer<typeof summarizationSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
