import { IChat } from "@gossip/shared";
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
