import {
  SummarizationSettings,
  TranslationSettings,
  UserSession,
} from "@gossip/shared";
import { SearchUserItem } from "@gossip/shared/schemas/user.schema";

export type ServerUserSession = UserSession & {
  socketId: string;
};

// Abstract class
export abstract class UserStore {
  abstract getUser(uid: string): ServerUserSession | undefined;

  abstract getSocketId(uid: string): string | undefined;

  abstract findUser(uid: string, socketuid: string): SearchUserItem[];

  abstract saveUser(uid: string, session: UserSession, socketId: string): void;

  abstract findAllUsers(): ServerUserSession[];

  abstract userDisconnected(uid: string, socketId: string): boolean;

  abstract updateTranslationSettings(
    uid: string,
    translationObject: TranslationSettings,
  ): void;

  abstract updateSummarizationSettings(
    uid: string,
    summarizationObject: SummarizationSettings,
  ): void;
}

export class ServerUserStore extends UserStore {
  private users = new Map<string, ServerUserSession>();

  findUser(uid: string, socketuid: string): SearchUserItem[] {
    const regex = new RegExp(uid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    return Array.from(this.users.values())
      .filter((item) => item.uid !== socketuid && regex.test(item.uid))
      .map(({ uid, profile, username }) => ({
        uid,
        profile,
        username,
      }));
  }

  getUser(uid: string): ServerUserSession | undefined {
    return this.users.get(uid);
  }

  getSocketId(uid: string): string | undefined {
    return this.users.get(uid)?.socketId;
  }

  saveUser(uid: string, session: UserSession, socketId: string): void {
    this.users.set(uid, { ...session, socketId });
  }

  userDisconnected(uid: string, socketId: string): boolean {
    const current = this.users.get(uid);
    if (!current || current.socketId !== socketId) {
      return false;
    }

    this.users.delete(uid);
    return true;
  }

  findAllUsers(): ServerUserSession[] {
    return [...this.users.values()];
  }

  updateTranslationSettings(
    uid: string,
    translationObject: TranslationSettings,
  ): void {
    const user = this.users.get(uid);

    if (user) {
      user.settings.translation = translationObject;
    }
  }

  updateSummarizationSettings(
    uid: string,
    summarizationObject: SummarizationSettings,
  ): void {
    const user = this.users.get(uid);

    if (user) {
      user.settings.summarization = summarizationObject;
    }
  }

  clear(): void {
    this.users.clear();
  }
}

export const userStore = new ServerUserStore();
export const UsersStore = userStore;
