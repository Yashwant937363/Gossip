import type { IChat, MessageType } from "./chat.types";
import type {
  SummarizationFormat,
  UserSettings,
} from "../schemas/settings.schema";
import { UserPreview } from "../schemas/user.schema";

export type SocketSuccessResponse<T = void> = {
  success: true;
  data?: T;
  message?: string;
};

export type SocketErrorResponse = {
  success: false;
  error: string;
  code: string;
};

export type SocketResponse<T = void> =
  | SocketSuccessResponse<T>
  | SocketErrorResponse;

export const socketSuccess = <T = void>(
  data?: T,
  message?: string,
): SocketSuccessResponse<T> => ({
  success: true,
  ...(data !== undefined ? { data } : {}),
  ...(message ? { message } : {}),
});

export const socketError = (
  error: string,
  code = "SOCKET_ERROR",
): SocketErrorResponse => ({
  success: false,
  error,
  code,
});

export type UserSession = UserPreview & {
  settings: UserSettings;
  online?: boolean;
};

export interface SendMessagePayload {
  touid: string;
  message: string;
  type: MessageType;
}

export interface SeenMessagesPayload {
  fromuid: string;
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
  [ServertoClientEvents.RequestFromUser]: (data: UserPreview) => void;
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

export type ServerHandler<E extends keyof ServerToClientEventsTypes> =
  ServerToClientEventsTypes[E];

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
    ack: (response: SocketResponse<IChat>) => void,
  ) => void;
  [ClientToServerEvents.SeenMessages]: (payload: SeenMessagesPayload) => void;

  // Friend & User events
  [ClientToServerEvents.SendChatRequest]: (
    payload: { fromuid: string; touid: string },
    ack: (response: SocketResponse) => void,
  ) => void;
  [ClientToServerEvents.RequestAnswer]: (
    payload: {
      fromuid: string;
      touid: string;
      answer: boolean;
    },
    ack: (response: SocketResponse) => void,
  ) => void;

  // Video Call events
  [ClientToServerEvents.VideoCallOutgoing]: (
    data: {
      fromuid: string;
      touid: string;
      offer: any;
    },
    ack: (res: SocketResponse) => void,
  ) => void;
  [ClientToServerEvents.VideoCallRinging]: (data: { fromuid: string }) => void;
  [ClientToServerEvents.VideoCallAnswer]: (data: {
    touid: string;
    answer: any;
  }) => void;
  [ClientToServerEvents.VideoCallCanceled]: (data: { touid: string }) => void;

  // Settings events
  [ClientToServerEvents.ChangeLanguage]: (
    data: { language: string },
    ack: (response: SocketResponse<{ language: string }>) => void,
  ) => void;
  [ClientToServerEvents.ChangeAlwaysTranslate]: (
    data: {
      alwaysTranslate: boolean;
    },
    ack: (response: SocketResponse<{ alwaysTranslate: boolean }>) => void,
  ) => void;
  [ClientToServerEvents.ChangeSummarizationFormat]: (
    data: {
      format: SummarizationFormat;
    },
    ack: (response: SocketResponse<{ format: SummarizationFormat }>) => void,
  ) => void;
}
