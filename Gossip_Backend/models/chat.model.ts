import { IChat, ITranslatedChat, MessageFormat } from "@gossip/shared";
import mongoose, { Schema } from "mongoose";
import { HydratedDocument } from "mongoose";

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

const chatSchema = new Schema<IChat>(
  {
    senderUid: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    receiverUid: {
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
      enum: Object.values(MessageFormat),
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
