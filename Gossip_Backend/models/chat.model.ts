import mongoose, { Schema } from "mongoose";
import { HydratedDocument } from "mongoose";

export interface ITranslatedChat {
  language: string;
  translatedText: string;
}

const translatedChatSchema = new Schema<ITranslatedChat>(
  {
    language: {
      type: String,
      required: true,
    },
    translatedText: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

export interface IChat {
  Sender_ID: string;
  Receiver_ID: string;
  text: string;
  seen: boolean | null;
  type: string;
  translatedText: ITranslatedChat[];
}

export const SeenChat = {
  Seen: true,
  Received: false,
  Sent: null,
} as const;

export type SeenChatType = (typeof SeenChat)[keyof typeof SeenChat];

const chatSchema = new Schema<IChat>(
  {
    Sender_ID: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    Receiver_ID: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    seen: {
      type: Boolean,
      default: null,
    },
    type: {
      type: String,
      required: true,
    },
    translatedText: {
      type: [translatedChatSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const Chat = mongoose.model("Chat", chatSchema);
export type ChatType = HydratedDocument<IChat>;
export default Chat;
