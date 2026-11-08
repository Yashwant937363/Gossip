import type { IChat } from "../models/chat.model.js";

export interface Friend {
  uid: string;
  profile: string;
  username: string;
  online: boolean;
}

export interface GetFriendsAndChatsResponse {
  msg: string;
  friends?: Friend[];
  chats?: IChat[];
}

export interface UploadChatImageResponse {
  success: boolean;
  url: string;
}
