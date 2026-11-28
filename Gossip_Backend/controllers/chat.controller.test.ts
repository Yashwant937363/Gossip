import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFriendsandChats } from "./chat.controller.js";
import * as userRepo from "../repository/user.repository.js";
import * as friendRepo from "../repository/friend.repository.js";
import * as chatRepo from "../repository/chat.repository.js";
import * as groqService from "../services/groq.service.js";
import { UsersStore } from "../store/sessionStore.js";

vi.mock("../repository/user.repository.js");
vi.mock("../repository/friend.repository.js");
vi.mock("../repository/chat.repository.js");
vi.mock("../services/groq.service.js");

describe("getFriendsandChats auto-translation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UsersStore.clear();
  });

  it("translates untranslated received text messages when alwaysTranslate is enabled and persists them", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "mongo-u1",
      uid: "u1000",
      settings: {
        translation: { language: "spanish", alwaysTranslate: true },
        summarization: { format: "paragraph" },
      },
    } as any);

    vi.mocked(friendRepo.getFriendUids).mockResolvedValue(["u2000"]);
    vi.mocked(userRepo.findUsersByUids).mockResolvedValue([
      { uid: "u2000", username: "Bob", profile: "" },
    ] as any);

    const mockChats = [
      {
        _id: { toString: () => "msg-1" },
        senderUid: "u2000",
        receiverUid: "u1000",
        text: "Hello!",
        type: "text",
        translatedText: [],
      },
      {
        _id: { toString: () => "msg-2" },
        senderUid: "u1000",
        receiverUid: "u2000",
        text: "Sent by me",
        type: "text",
        translatedText: [],
      },
    ];
    vi.mocked(chatRepo.getUserChatHistory).mockResolvedValue(mockChats as any);
    vi.mocked(groqService.translateMessages).mockResolvedValue({
      language: "spanish",
      messages: [{ id: "msg-1", translatedText: "¡Hola!" }],
    });

    const req = { log: { info: vi.fn(), warn: vi.fn() } } as any;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { locals: { id: "mongo-u1" }, status } as any;
    const next = vi.fn();

    await getFriendsandChats(req, res, next);

    expect(groqService.translateMessages).toHaveBeenCalledWith({
      messages: [{ id: "msg-1", text: "Hello!" }],
      to: "spanish",
    });
    expect(chatRepo.saveMessageTranslations).toHaveBeenCalledWith(
      "spanish",
      [{ id: "msg-1", translatedText: "¡Hola!" }],
      "u1000",
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(mockChats[0].translatedText).toEqual([
      { language: "spanish", translatedText: "¡Hola!" },
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  it("still returns friends and chats if auto-translation fails", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "mongo-u1",
      uid: "u1000",
      settings: {
        translation: { language: "spanish", alwaysTranslate: true },
        summarization: { format: "paragraph" },
      },
    } as any);

    vi.mocked(friendRepo.getFriendUids).mockResolvedValue(["u2000"]);
    vi.mocked(userRepo.findUsersByUids).mockResolvedValue([
      { uid: "u2000", username: "Bob", profile: "" },
    ] as any);
    vi.mocked(chatRepo.getUserChatHistory).mockResolvedValue([
      {
        _id: { toString: () => "msg-1" },
        senderUid: "u2000",
        receiverUid: "u1000",
        text: "Hello!",
        type: "text",
        translatedText: [],
      },
    ] as any);
    vi.mocked(groqService.translateMessages).mockRejectedValue(
      new Error("Groq timeout"),
    );

    const req = { log: { info: vi.fn(), warn: vi.fn() } } as any;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { locals: { id: "mongo-u1" }, status } as any;
    const next = vi.fn();

    await getFriendsandChats(req, res, next);

    expect(req.log.warn).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
