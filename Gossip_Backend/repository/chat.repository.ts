import Chat, { type ChatType, type IChat } from "../models/chat.model.js";

export async function createChatMessage(
  chatData: Partial<IChat>,
): Promise<ChatType> {
  return (await Chat.create(chatData)) as ChatType;
}

export async function markMessagesAsSeen(senderUid: string, receiverUid: string) {
  return await Chat.updateMany(
    { Sender_ID: senderUid, Receiver_ID: receiverUid },
    { seen: true },
  );
}

export async function markDeliveredMessages(receiverUid: string) {
  return await Chat.updateMany(
    { Receiver_ID: receiverUid, seen: null },
    { seen: false },
  );
}

export async function getUserChatHistory(uid: string) {
  return await Chat.find({
    $or: [{ Sender_ID: uid }, { Receiver_ID: uid }],
  })
    .sort({ createdAt: 1 })
    .select({ __v: 0 });
}
