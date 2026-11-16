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
import { ClientToServerEvents } from "@gossip/shared";

export default function registerSettingsHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const changeLanguage: ClientHandler<
    ClientToServerEvents.ChangeLanguage
  > = async ({ language }) => {
    try {
      const id = socket.data.id;
      const uid = socket.data.uid;

      const updatedUser = await updateTranslationLanguage(id, language);

      if (updatedUser) {
        usersStore.updateTranslationSettings(
          uid,
          updatedUser.settings.translation,
        );
      }
    } catch (error) {
      console.error("Error in settings:translate:languageChange:", error);
    }
  };

  const changeAlwaysTranslate: ClientHandler<
    ClientToServerEvents.ChangeAlwaysTranslate
  > = async ({ alwaysTranslate }) => {
    try {
      const id = socket.data.id;
      const uid = socket.data.uid;

      const updatedUser = await updateAlwaysTranslate(id, alwaysTranslate);

      if (updatedUser) {
        usersStore.updateTranslationSettings(
          uid,
          updatedUser.settings.translation,
        );
      }
    } catch (error) {
      console.error(
        "Error in settings:translate:alwaysTranslateChange:",
        error,
      );
    }
  };

  const changeSummarizationFormat: ClientHandler<
    ClientToServerEvents.ChangeSummarizationFormat
  > = async ({ format }) => {
    try {
      const id = socket.data.id;
      const uid = socket.data.uid;

      const updatedUser = await updateSummarizationFormat(id, format);

      if (updatedUser) {
        usersStore.updateSummarizationSettings(
          uid,
          updatedUser.settings.summarization as any,
        );
      }
    } catch (error) {
      console.error("Error in settings:summarization:formatChange:", error);
    }
  };

  socket.on(ClientToServerEvents.ChangeLanguage, changeLanguage);
  socket.on(ClientToServerEvents.ChangeAlwaysTranslate, changeAlwaysTranslate);
  socket.on(
    ClientToServerEvents.ChangeSummarizationFormat,
    changeSummarizationFormat,
  );
}
