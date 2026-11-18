import { IChat } from "@gossip/shared";
import mongoose from "mongoose";
import Chat, { type ChatType } from "../models/chat.model.js";

export type CreateChatMessageInput = Omit<
  IChat,
  "_id" | "createdAt" | "updatedAt"
>;
export async function createChatMessage(
  chatData: CreateChatMessageInput,
): Promise<ChatType> {
  return (await Chat.create(chatData)) as ChatType;
}

export async function markMessagesAsSeen(
  senderUid: string,
  receiverUid: string,
) {
  return await Chat.updateMany({ senderUid, receiverUid }, { seen: true });
}

export async function markDeliveredMessages(receiverUid: string) {
  return await Chat.updateMany({ receiverUid, seen: null }, { seen: false });
}

export async function getUserChatHistory(uid: string) {
  return await Chat.find({
    $or: [{ senderUid: uid }, { receiverUid: uid }],
  })
    .sort({ createdAt: 1 })
    .select({ __v: 0 });
}

export interface MessageTranslationUpdate {
  id: string;
  translatedText: string;
}

export async function saveMessageTranslations(
  language: string,
  translations: MessageTranslationUpdate[],
) {
  if (!translations || translations.length === 0) return;

  const validTranslations = translations.filter(
    (t) => t.id && mongoose.Types.ObjectId.isValid(t.id),
  );

  if (validTranslations.length === 0) return;

  const bulkOps = validTranslations.map((item) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(item.id) },
      update: [
        {
          $set: {
            translatedText: {
              $concatArrays: [
                {
                  $filter: {
                    input: { $ifNull: ["$translatedText", []] },
                    as: "translation",
                    cond: {
                      $ne: ["$$translation.language", language],
                    },
                  },
                },
                [
                  {
                    language: { $literal: language },
                    translatedText: { $literal: item.translatedText },
                  },
                ],
              ],
            },
          },
        },
      ],
    },
  }));

  return Chat.bulkWrite(bulkOps, { ordered: false });
}
