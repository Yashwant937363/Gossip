export interface ITranslatedChat {
  language: string;
  translatedText: string;
}

export interface IChat {
  _id?: string;
  Sender_ID: string;
  Receiver_ID: string;
  text: string;
  seen: boolean | null;
  type: string;
  translatedText: ITranslatedChat[];
  createdAt?: Date;
  updatedAt?: Date;
}

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
