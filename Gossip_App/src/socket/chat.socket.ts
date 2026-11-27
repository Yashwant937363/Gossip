import type { Dispatch } from "@reduxjs/toolkit";
import {
  ClientToServerEvents,
  type IChat,
  ServertoClientEvents,
} from "@gossip/shared";
import { addChat, setSeenMessages } from "../store/slices/ChatSlice";
import type { AppDispatch } from "../store/store";
import { type AppSocket, socket } from "./client";

export function sendMessage({
  touid,
  message,
  dispatch,
  type = "text",
}: {
  touid: string;
  message: string | any;
  dispatch: Dispatch;
  type: "text" | "image";
}): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.emit(
      ClientToServerEvents.SendMessage,
      { touid, message, type },
      (ack) => {
        if (ack.success == false) {
          reject(new Error(ack.error || "Message has not been sent"));
        } else {
          dispatch(addChat(ack.data));
          resolve(ack);
        }
      },
    );
  });
}

export function seenMessages({ fromuid }: { fromuid: string }): void {
  socket.emit(ClientToServerEvents.SeenMessages, { fromuid });
}

export function registerChatListeners(
  appSocket: AppSocket,
  dispatch: AppDispatch,
): () => void {
  const onReceiveMessage = (newChat: IChat) => {
    dispatch(addChat(newChat));
  };

  const onSeenMessages = ({ uid }: { uid: string }) => {
    dispatch(setSeenMessages(uid));
  };

  appSocket.on(ServertoClientEvents.ReceiveMessage, onReceiveMessage);
  appSocket.on(ServertoClientEvents.SeenMessages, onSeenMessages);

  return () => {
    appSocket.off(ServertoClientEvents.ReceiveMessage, onReceiveMessage);
    appSocket.off(ServertoClientEvents.SeenMessages, onSeenMessages);
  };
}
