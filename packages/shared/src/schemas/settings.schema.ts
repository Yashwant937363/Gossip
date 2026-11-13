import { z } from "zod";

export const translationSettingsSchema = z.object({
  language: z.string().default("original"),
  alwaysTranslate: z.boolean().default(false),
});

export const summarizationSettingsSchema = z.object({
  format: z.enum(["paragraph", "bullet", "structured"]).default("paragraph"),
});

export const userSettingsSchema = z.object({
  translation: translationSettingsSchema,
  summarization: summarizationSettingsSchema,
});

export type TranslationSettings = z.infer<typeof translationSettingsSchema>;
export type SummarizationSettings = z.infer<typeof summarizationSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
