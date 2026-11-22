import { UserPreview } from "../schemas/user.schema";
import { UserSession } from "./socket.types";

export interface ITranslatedChat {
  language: string;
  translatedText: string;
}

export const SeenChat = {
  Seen: true,
  Received: false,
  Sent: null,
} as const;

export type SeenChatType = (typeof SeenChat)[keyof typeof SeenChat];

export const MessageFormat = {
  Image: "image",
  Text: "text",
} as const;
export type MessageType = (typeof MessageFormat)[keyof typeof MessageFormat];

export interface IChat {
  _id?: string;
  senderUid: string;
  receiverUid: string;
  text: string;
  seen: SeenChatType;
  type: MessageType;
  translatedText: ITranslatedChat[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type Friend = UserPreview & {
  online?: boolean;
};
export interface GetFriendsAndChatsResponse {
  friends: Friend[];
  chats: IChat[];
}

export interface UploadChatImageResponse {
  success: boolean;
  url: string;
}
