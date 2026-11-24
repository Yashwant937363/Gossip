import { UserNotFoundError } from "../errors/index.js";
import { authSocket } from "../middlewares/authSocket.middleware.js";
import {
  updateAlwaysTranslate,
  updateSummarizationFormat,
  updateTranslationLanguage,
} from "../repository/user.repository.js";
import type { UserStore } from "../store/sessionStore.js";
import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";
import { ClientToServerEvents, socketSuccess } from "@gossip/shared";
import { safeSocketHandler } from "../utils/socket-error-handler.js";

export default function registerSettingsHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const changeLanguage: ClientHandler<
    ClientToServerEvents.ChangeLanguage
  > = async ({ language }, ack) => {
    const id = socket.data.id;
    const uid = socket.data.uid;

    const updatedUser = await updateTranslationLanguage(id, language);

    if (updatedUser) {
      socket.data.log.info("Translation Language Changed");
      usersStore.updateTranslationSettings(
        uid,
        updatedUser.settings.translation,
      );
      ack(socketSuccess({ language }));
    } else {
      throw new UserNotFoundError("User Not Found: Please Refresh the Page");
    }
  };

  const changeAlwaysTranslate: ClientHandler<
    ClientToServerEvents.ChangeAlwaysTranslate
  > = async ({ alwaysTranslate }, ack) => {
    const id = socket.data.id;
    const uid = socket.data.uid;

    const updatedUser = await updateAlwaysTranslate(id, alwaysTranslate);

    if (updatedUser) {
      socket.data.log.info("Always Translation Settings Changed");
      usersStore.updateTranslationSettings(
        uid,
        updatedUser.settings.translation,
      );
      ack(socketSuccess({ alwaysTranslate }));
    } else {
      throw new UserNotFoundError("User Not Found: Please Refresh the Page");
    }
  };

  const changeSummarizationFormat: ClientHandler<
    ClientToServerEvents.ChangeSummarizationFormat
  > = async ({ format }, ack) => {
    const id = socket.data.id;
    const uid = socket.data.uid;

    const updatedUser = await updateSummarizationFormat(id, format);

    if (updatedUser) {
      socket.data.log.info("Summarization Settings Changed");
      usersStore.updateSummarizationSettings(
        uid,
        updatedUser.settings.summarization as any,
      );
      ack(socketSuccess({ format }));
    } else {
      throw new UserNotFoundError("User Not Found: Please Refresh the Page");
    }
  };

  socket.on(
    ClientToServerEvents.ChangeLanguage,
    safeSocketHandler(
      socket,
      ClientToServerEvents.ChangeLanguage,
      changeLanguage,
    ),
  );
  socket.on(
    ClientToServerEvents.ChangeAlwaysTranslate,
    safeSocketHandler(
      socket,
      ClientToServerEvents.ChangeAlwaysTranslate,
      changeAlwaysTranslate,
    ),
  );
  socket.on(
    ClientToServerEvents.ChangeSummarizationFormat,
    safeSocketHandler(
      socket,
      ClientToServerEvents.ChangeSummarizationFormat,
      changeSummarizationFormat,
    ),
  );
}
