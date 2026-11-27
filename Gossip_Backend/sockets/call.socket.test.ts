import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvents, ServertoClientEvents } from "@gossip/shared";
import * as friendRepo from "../repository/friend.repository.js";
import { userStore } from "../store/sessionStore.js";
import registerCallHandlers from "./call.socket.js";

describe("call.socket friendship authorization", () => {
  let mockSocket: any;
  let roomEmit: any;

  const mockIsFriend = vi.spyOn(friendRepo, "isFriend");

  beforeEach(() => {
    vi.clearAllMocks();
    userStore.clear();
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
    registerCallHandlers({} as any, mockSocket);
  });

  it("rejects VideoCallOutgoing with NOT_FRIENDS when caller and callee are not friends", async () => {
    mockIsFriend.mockResolvedValue(false);
    const ack = vi.fn();

    const [listener] = mockSocket.rawListeners(
      ClientToServerEvents.VideoCallOutgoing,
    );
    await listener({ touid: "stranger", offer: {} } as any, ack);

    expect(mockIsFriend).toHaveBeenCalledWith("user1", "stranger");
    expect(roomEmit).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "NOT_FRIENDS",
      }),
    );
  });

  it("emits VideoCallIncoming when users are friends and receiver is online", async () => {
    mockIsFriend.mockResolvedValue(true);
    userStore.saveUser(
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

    const [listener] = mockSocket.rawListeners(
      ClientToServerEvents.VideoCallOutgoing,
    );
    await listener({ touid: "friend1", offer: { sdp: "x" } } as any, ack);

    expect(roomEmit).toHaveBeenCalledWith(
      ServertoClientEvents.VideoCallIncoming,
      { fromuid: "user1", offer: { sdp: "x" } },
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
