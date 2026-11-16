import mongoose, { Schema } from "mongoose";
import {
  SUMMARIZATION_FORMATS,
  SummarizationSettings,
  TranslationSettings,
  UserSettings,
} from "@gossip/shared";
import { BaseUser } from "@gossip/shared/schemas/user.schema";

const TranslationSettingsModelSchema = new Schema<TranslationSettings>(
  {
    language: { type: String, required: true, default: "original" },
    alwaysTranslate: { type: Boolean, default: false },
  },
  { _id: false },
);

const SummarizationSettingsModelSchema = new Schema<SummarizationSettings>(
  {
    format: {
      type: String,
      enum: SUMMARIZATION_FORMATS,
      default: "paragraph",
      required: true,
    },
  },
  { _id: false },
);

const UserSettingsModelSchema = new Schema<UserSettings>(
  {
    translation: {
      type: TranslationSettingsModelSchema,
      required: true,
    },
    summarization: {
      type: SummarizationSettingsModelSchema,
      required: true,
    },
  },
  { _id: false },
);

export interface IUserDocument extends BaseUser {
  uid: string;
  password: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
    },
    firstname: {
      type: String,
      default: "",
    },
    lastname: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
      maxLength: 5,
      minLength: 5,
    },
    profile: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    settings: {
      type: UserSettingsModelSchema,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
export default User;
