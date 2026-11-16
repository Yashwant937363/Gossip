import { z } from "zod";
import { userSettingsSchema } from "./settings.schema";

export const baseUserSchema = z.object({
  username: z.string().trim().min(3),
  firstname: z.string().trim(),
  lastname: z.string().trim(),
  email: z.string().email(),
  profile: z.string().default(""),
  settings: userSettingsSchema,
});

export type BaseUser = z.infer<typeof baseUserSchema>;

export const publicUserSchema = baseUserSchema.extend({
  uid: z.string().length(5),
  settings: userSettingsSchema,
});

export type IPublicUser = z.infer<typeof publicUserSchema>;

export const userPreviewSchema = publicUserSchema.pick({
  uid: true,
  username: true,
  profile: true,
});

export type UserPreview = z.infer<typeof userPreviewSchema>;

export type SearchUserItem = UserPreview;
