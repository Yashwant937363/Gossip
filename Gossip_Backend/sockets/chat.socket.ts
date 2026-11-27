import { EmptyMessageError, NotFriendsError } from "../errors/index.js";
import {
  createChatMessage,
  markMessagesAsSeen,
} from "../repository/chat.repository.js";
import { isFriend } from "../repository/friend.repository.js";
import { translateMessages } from "../services/groq.service.js";
import type { UserStore } from "../store/sessionStore.js";
import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";

import {
  ClientToServerEvents,
  IChat,
  ServertoClientEvents,
  socketSuccess,
} from "@gossip/shared";
import { onSocketEvent } from "../utils/on-socket-event.js";

export default function registerChatHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const sendMessage: ClientHandler<ClientToServerEvents.SendMessage> = async (
    { touid, message, type },
    ack,
  ) => {
    const fromuid = socket.data.uid;
    let newChat: IChat;

    if (type === "text" && message.trim() === "") {
      throw new EmptyMessageError();
    }

    if (!(await isFriend(fromuid, touid))) {
      throw new NotFriendsError();
    }

    const receiver = usersStore.getUser(touid);
    let getTranslated: { language: string; translatedText: string } | undefined;

    if (
      receiver &&
      receiver.settings.translation.alwaysTranslate &&
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
        socket.data.log.error("Translation during chat send error:" + err);
      }
    }

    newChat = await createChatMessage({
      senderUid: fromuid,
      receiverUid: touid,
      text: message,
      type: type,
      seen: false,
      translatedText: getTranslated ? [getTranslated] : [],
    });

    if (receiver) {
      socket.to(touid).emit(ServertoClientEvents.ReceiveMessage, newChat);
    }
    ack(socketSuccess(newChat));
  };

  const receiverSeenMessages: ClientHandler<
    ClientToServerEvents.SeenMessages
  > = async ({ fromuid }) => {
    const touid = socket.data.uid;
    await markMessagesAsSeen(fromuid, touid);
    socket.to(fromuid).emit(ServertoClientEvents.SeenMessages, { uid: touid });
  };

  onSocketEvent(socket, ClientToServerEvents.SendMessage, sendMessage);
  onSocketEvent(
    socket,
    ClientToServerEvents.SeenMessages,
    receiverSeenMessages,
  );
}
