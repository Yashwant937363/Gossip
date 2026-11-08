import type { Server, Socket } from "socket.io";
import type { UserSearchResult, UserSession } from "../store/sessionStore.js";
import { ChatType } from "../models/chat.model.js";

export interface SocketData {
  id: string; // Mongo user ObjectId string
  uid: string; // User 5-char unique ID
  user: UserSession; // User document or session
}

export interface SendMessagePayload {
  fromuid: string;
  touid: string;
  message: string;
  type: "text" | "image";
}

export interface SeenMessagesPayload {
  fromuid: string;
  touid: string;
}

export enum ServertoClientEvents {
  ReceiveMessage = "chat:receivemessage",
  SeenMessages = "chat:seenmessages",
  FriendOnline = "user:friendonline",
  FriendOffline = "user:friendoffline",
  RequestFromUser = "user:requestfromuser",
  SuccessMessage = "successmessage",
  ErrorMessage = "errormessage",
  VideoCallIncoming = "call:videocallincoming",
  VideoCallRinging = "call:videocallringing",
  VideoCallAnswer = "call:videocallanswer",
  VideoCallCanceled = "call:videocallcanceled",
}

export interface ServerToClientEventsTypes {
  // Chat events
  [ServertoClientEvents.ReceiveMessage]: (chat: any) => void;
  [ServertoClientEvents.SeenMessages]: (data: { uid: string }) => void;

  // Presence events
  [ServertoClientEvents.FriendOnline]: (data: { uid: string }) => void;
  [ServertoClientEvents.FriendOffline]: (data: { uid: string }) => void;

  // Friend request events
  [ServertoClientEvents.RequestFromUser]: (data: {
    uid: string;
    profile: string;
    username: string;
  }) => void;
  [ServertoClientEvents.SuccessMessage]: (data: {
    msg: string;
    user?: any;
  }) => void;
  [ServertoClientEvents.ErrorMessage]: (msg: string) => void;

  // WebRTC Call events
  [ServertoClientEvents.VideoCallIncoming]: (data: {
    fromuid: string;
    offer: any;
  }) => void;
  [ServertoClientEvents.VideoCallRinging]: () => void;
  [ServertoClientEvents.VideoCallAnswer]: (data: { answer: any }) => void;
  [ServertoClientEvents.VideoCallCanceled]: () => void;
}

export enum ClientToServerEvents {
  SendMessage = "chat:sendmessage",
  SeenMessages = "chat:seenmessages",
  SendChatRequest = "user:sendchatrequest",
  RequestAnswer = "user:requestanswer",
  VideoCallOutgoing = "call:videocalloutgoing",
  VideoCallRinging = "call:videocallringing",
  VideoCallAnswer = "call:videocallanswer",
  VideoCallCanceled = "call:videocallcanceled",
  ChangeLanguage = "settings:translate:languageChange",
  ChangeAlwaysTranslate = "settings:translate:alwaysTranslateChange",
  ChangeSummarizationFormat = "settings:summarization:formatChange",
}

export interface ClientToServerEventsTypes {
  // Chat events
  [ClientToServerEvents.SendMessage]: (
    payload: SendMessagePayload,
    ack: (result: ChatType | false) => void,
  ) => void;
  [ClientToServerEvents.SeenMessages]: (payload: SeenMessagesPayload) => void;

  // Friend & User events
  [ClientToServerEvents.SendChatRequest]: (
    fromuid: string,
    touid: string,
    feedback: (msg: string) => void,
  ) => void;
  [ClientToServerEvents.RequestAnswer]: (
    payload: {
      fromuid: string;
      touid: string;
      answer: boolean;
    },
    feedback: (msg: string | null) => void,
  ) => void;

  // WebRTC Call events
  [ClientToServerEvents.VideoCallOutgoing]: (data: {
    fromuid: string;
    touid: string;
    offer: any;
  }) => void;
  [ClientToServerEvents.VideoCallRinging]: (data: { fromuid: string }) => void;
  [ClientToServerEvents.VideoCallAnswer]: (data: {
    touid: string;
    answer: any;
  }) => void;
  [ClientToServerEvents.VideoCallCanceled]: (data: { touid: string }) => void;

  // Settings events
  [ClientToServerEvents.ChangeLanguage]: (data: { language: string }) => void;
  [ClientToServerEvents.ChangeAlwaysTranslate]: (data: {
    alwaysTranslate: boolean;
  }) => void;
  [ClientToServerEvents.ChangeSummarizationFormat]: (data: {
    format: "paragraph" | "bullet_points";
  }) => void;
}

export type ClientHandler<E extends keyof ClientToServerEventsTypes> =
  ClientToServerEventsTypes[E];

export interface InterServerEvents {}

export type TypedServer = Server<
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
  InterServerEvents,
  SocketData
>;
