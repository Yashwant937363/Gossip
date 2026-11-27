import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvents, ServertoClientEvents } from "@gossip/shared";
import * as friendRepo from "../repository/friend.repository.js";
import * as chatRepo from "../repository/chat.repository.js";
import { ServerUserStore } from "../store/sessionStore.js";
import registerChatHandlers from "./chat.socket.js";

describe("chat.socket friendship authorization", () => {
  let store: ServerUserStore;
  let mockSocket: any;
  let roomEmit: any;

  const mockIsFriend = vi.spyOn(friendRepo, "isFriend");
  const mockCreateChat = vi.spyOn(chatRepo, "createChatMessage");

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ServerUserStore();
    roomEmit = vi.fn();

    const emitter = new EventEmitter();
    mockSocket = Object.assign(emitter, {
      to: vi.fn(() => ({ emit: roomEmit })),
      data: {
        uid: "user1",
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });
    vi.spyOn(mockSocket, "emit");
    registerChatHandlers({} as any, mockSocket, store);
  });

  it("rejects SendMessage with NOT_FRIENDS when users are not friends", async () => {
    mockIsFriend.mockResolvedValue(false);
    const ack = vi.fn();

    const [listener] = mockSocket.rawListeners(ClientToServerEvents.SendMessage);
    await listener({ touid: "stranger", message: "hi", type: "text" }, ack);

    expect(mockIsFriend).toHaveBeenCalledWith("user1", "stranger");
    expect(mockCreateChat).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "NOT_FRIENDS",
      }),
    );
  });

  it("creates and delivers message when users are friends", async () => {
    mockIsFriend.mockResolvedValue(true);
    mockCreateChat.mockResolvedValue({
      _id: "c1",
      senderUid: "user1",
      receiverUid: "friend1",
      text: "hi",
      type: "text",
      seen: false,
      translatedText: [],
    } as any);
    store.saveUser(
      "friend1",
      {
        uid: "friend1",
        username: "bob",
        profile: "",
        online: true,
        settings: {
          translation: { alwaysTranslate: false, language: "en" },
          summarization: { format: "bullet" },
        },
      },
      "sock-2",
    );
    const ack = vi.fn();

    const [listener] = mockSocket.rawListeners(ClientToServerEvents.SendMessage);
    await listener({ touid: "friend1", message: "hi", type: "text" }, ack);

    expect(mockCreateChat).toHaveBeenCalledOnce();
    expect(roomEmit).toHaveBeenCalledWith(
      ServertoClientEvents.ReceiveMessage,
      expect.objectContaining({ _id: "c1" }),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
