import { z } from "zod";
import { baseUserSchema, publicUserSchema } from "./user.schema";

export const signupReqSchema = baseUserSchema.extend({ password: z.string() });

export type SignupReq = z.infer<typeof signupReqSchema>;

export const signupResponseSchema = z.object({
  authtoken: z.string(),
  uid: z.string(),
});
export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const signinReqSchema = baseUserSchema.pick({ email: true }).extend({
  password: z.string().min(1, "Password is required"),
});
export type SigninReq = z.infer<typeof signinReqSchema>;

export const signinResponseSchema = publicUserSchema.extend({
  authtoken: z.string(),
  msg: z.string(),
});
export type SigninResponse = z.infer<typeof signinResponseSchema>;

export const sendEmailOtpReqSchema = baseUserSchema.pick({ email: true });
export type SendEmailOtpReq = z.infer<typeof sendEmailOtpReqSchema>;

export const getUserResponseSchema = z.object({
  msg: z.string(),
  user: publicUserSchema,
});

export type GetUserResponse = z.infer<typeof getUserResponseSchema>;
