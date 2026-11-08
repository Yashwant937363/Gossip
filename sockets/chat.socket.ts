import type { ChatType } from "../models/chat.model.js";
import {
  createChatMessage,
  markMessagesAsSeen,
} from "../repository/chat.repository.js";
import { translateMessages } from "../services/groq.service.js";
import type { UserStore } from "../store/sessionStore.js";
import type {
  ClientHandler,
  SeenMessagesPayload,
  SendMessagePayload,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";

import {
  ClientToServerEvents,
  ServertoClientEvents,
} from "../types/socket.types.js";

export default function registerChatHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const sendMessage: ClientHandler<ClientToServerEvents.SendMessage> = async (
    { touid, message, type },
    acknowledgmentCallback,
  ) => {
    try {
      const fromuid = socket.data.uid;
      let newChat: any;

      if (type === "text") {
        if (!message || message.trim() === "") {
          return acknowledgmentCallback(false);
        }
      }

      const receiver = usersStore.getUser(touid);

      if (receiver) {
        let getTranslated:
          | { language: string; translatedText: string }
          | undefined;

        if (
          receiver.settings?.translation?.alwaysTranslate &&
          type === "text"
        ) {
          try {
            const translationRes = await translateMessages({
              messages: [{ id: "new", text: message }],
              to: receiver.settings.translation.language,
            });

            if (translationRes.messages.length > 0) {
              getTranslated = {
                language: translationRes.language,
                translatedText: translationRes.messages[0].translatedText,
              };
            }
          } catch (err) {
            console.error("Translation during chat send error:", err);
          }
        }

        newChat = await createChatMessage({
          Sender_ID: fromuid,
          Receiver_ID: touid,
          text: message,
          type: type,
          seen: false,
          translatedText: getTranslated ? [getTranslated] : [],
        });

        socket.to(touid).emit(ServertoClientEvents.ReceiveMessage, newChat);
      } else {
        newChat = await createChatMessage({
          Sender_ID: fromuid,
          Receiver_ID: touid,
          type: type,
          text: message,
          seen: false,
        });
      }

      acknowledgmentCallback(newChat);
    } catch (error) {
      console.error("Error in chat:sendmessage handler:", error);
      acknowledgmentCallback(false);
    }
  };

  const receiverSeenMessages: ClientHandler<
    ClientToServerEvents.SeenMessages
  > = async ({ fromuid }) => {
    try {
      const touid = socket.data.uid;
      await markMessagesAsSeen(fromuid, touid);
      socket
        .to(fromuid)
        .emit(ServertoClientEvents.SeenMessages, { uid: touid });
    } catch (error) {
      console.error("Error in chat:seenmessages handler:", error);
    }
  };

  socket.on(ClientToServerEvents.SendMessage, sendMessage);
  socket.on(ClientToServerEvents.SeenMessages, receiverSeenMessages);
}
