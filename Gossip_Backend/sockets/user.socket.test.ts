import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvents, ServertoClientEvents } from "@gossip/shared";
import * as friendRepo from "../repository/friend.repository.js";
import * as chatRepo from "../repository/chat.repository.js";
import { ServerUserStore } from "../store/sessionStore.js";
import registerUserHandlers, { setupUserSession } from "./user.socket.js";
import { onSocketEvent } from "../utils/on-socket-event.js";

describe("User socket session lifecycle", () => {
  let store: ServerUserStore;
  let io: any;
  let ioToEmit: any;
  let socketsMap: Map<string, any>;

  const mockGetFriendUids = vi.spyOn(friendRepo, "getFriendUids");
  const mockMarkDelivered = vi.spyOn(chatRepo, "markDeliveredMessages");

  function createMockSocket(id: string, uid = "user1") {
    const emitter = new EventEmitter();
    const roomEmit = vi.fn();
    const socket: any = Object.assign(emitter, {
      id,
      connected: true,
      join: vi.fn(),
      leave: vi.fn(),
      disconnect: vi.fn(),
      to: vi.fn(() => ({ emit: roomEmit })),
      data: {
        id: "mongo-1",
        uid,
        user: {
          uid,
          username: "alice",
          profile: "pic.png",
          online: true,
          settings: {
            translation: { alwaysTranslate: false, language: "en" },
            summarization: { format: "bullet" },
          },
        },
        log: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      },
      _roomEmit: roomEmit,
    });
    vi.spyOn(socket, "emit");
    socketsMap.set(id, socket);
    return socket;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ServerUserStore();
    socketsMap = new Map();
    ioToEmit = vi.fn();
    io = {
      to: vi.fn(() => ({ emit: ioToEmit })),
      sockets: {
        sockets: socketsMap,
      },
    };
    mockGetFriendUids.mockResolvedValue(["friend1", "friend2"]);
    mockMarkDelivered.mockResolvedValue(undefined as any);
  });

  it("registers user session and emits FriendOnline when previously offline", async () => {
    const socket = createMockSocket("sock-1");

    await setupUserSession(io, socket, store);

    expect(store.getSocketId("user1")).toBe("sock-1");
    expect(socket.join).toHaveBeenCalledWith("user1");
    expect(socket.to).toHaveBeenCalledWith(["friend1", "friend2"]);
    expect(socket._roomEmit).toHaveBeenCalledWith(
      ServertoClientEvents.FriendOnline,
      { uid: "user1" },
    );
    expect(mockMarkDelivered).toHaveBeenCalledWith("user1");
  });

  it("replaces previous session, drains its active events, disconnects old socket, and skips duplicate FriendOnline", async () => {
    const oldSocket = createMockSocket("sock-old");
    await setupUserSession(io, oldSocket, store);
    vi.clearAllMocks();
    mockGetFriendUids.mockResolvedValue(["friend1"]);
    mockMarkDelivered.mockResolvedValue(undefined as any);

    let finishActiveEvent!: () => void;
    onSocketEvent(oldSocket, ClientToServerEvents.SendChatRequest, () => {
      return new Promise<void>((res) => {
        finishActiveEvent = res;
      });
    });

    const [activeListener] = oldSocket.rawListeners(
      ClientToServerEvents.SendChatRequest,
    );
    const activeEventPromise = activeListener(
      { fromuid: "user1", touid: "friend1" },
      vi.fn(),
    );

    const newSocket = createMockSocket("sock-new");
    await setupUserSession(io, newSocket, store);

    // New socket owns the session immediately; old socket is marked replacing and not yet disconnected
    expect(store.getSocketId("user1")).toBe("sock-new");
    expect(oldSocket.data.isReplacing).toBe(true);
    expect(oldSocket.disconnect).not.toHaveBeenCalled();
    expect(newSocket._roomEmit).not.toHaveBeenCalledWith(
      ServertoClientEvents.FriendOnline,
      expect.anything(),
    );

    // Finish the old socket's in-flight event and flush microtasks
    finishActiveEvent();
    await activeEventPromise;
    await new Promise((r) => setTimeout(r, 0));

    expect(io.to).toHaveBeenCalledWith("sock-old");
    expect(ioToEmit).toHaveBeenCalledWith(
      ServertoClientEvents.ErrorMessage,
      "You have been logged in from another session",
    );
    expect(oldSocket.disconnect).toHaveBeenCalledWith(true);
  });

  it("does not emit FriendOffline or delete new session when stale socket disconnects", async () => {
    const oldSocket = createMockSocket("sock-old");
    const newSocket = createMockSocket("sock-new");

    registerUserHandlers(io, oldSocket, store);
    store.saveUser("user1", newSocket.data.user, "sock-new");

    const [disconnectHandler] = oldSocket.rawListeners("disconnect");
    await disconnectHandler("transport close");

    expect(store.getSocketId("user1")).toBe("sock-new");
    expect(mockGetFriendUids).not.toHaveBeenCalled();
    expect(oldSocket._roomEmit).not.toHaveBeenCalled();
  });

  it("waits for active events to drain and emits FriendOffline on normal disconnect", async () => {
    const socket = createMockSocket("sock-1");
    await setupUserSession(io, socket, store);
    registerUserHandlers(io, socket, store);

    let finishActiveEvent!: () => void;
    onSocketEvent(socket, ClientToServerEvents.SendMessage, () => {
      return new Promise<void>((res) => {
        finishActiveEvent = res;
      });
    });

    const [activeListener] = socket.rawListeners(
      ClientToServerEvents.SendMessage,
    );
    const activeEventPromise = activeListener(
      { touid: "friend1", message: "hi", type: "text" },
      vi.fn(),
    );

    const [disconnectHandler] = socket.rawListeners("disconnect");
    const disconnectPromise = disconnectHandler("client namespace disconnect");

    // Store cleared immediately, but FriendOffline waits until active event finishes
    expect(store.getUser("user1")).toBeUndefined();
    expect(socket._roomEmit).not.toHaveBeenCalledWith(
      ServertoClientEvents.FriendOffline,
      expect.anything(),
    );

    finishActiveEvent();
    await activeEventPromise;
    await disconnectPromise;

    expect(socket._roomEmit).toHaveBeenCalledWith(
      ServertoClientEvents.FriendOffline,
      { uid: "user1" },
    );
    expect(socket.emit).not.toHaveBeenCalledWith(
      ServertoClientEvents.ErrorMessage,
      expect.anything(),
    );
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("skips FriendOffline if user reconnects while disconnect is awaiting friendUids", async () => {
    const socket = createMockSocket("sock-1");
    await setupUserSession(io, socket, store);
    registerUserHandlers(io, socket, store);

    let resolveFriends!: (uids: string[]) => void;
    mockGetFriendUids.mockReturnValueOnce(
      new Promise((res) => {
        resolveFriends = res;
      }),
    );

    const [disconnectHandler] = socket.rawListeners("disconnect");
    const disconnectPromise = disconnectHandler("transport close");

    await Promise.resolve();
    // Simulate quick reconnect during getFriendUids await
    store.saveUser("user1", socket.data.user, "sock-2");

    resolveFriends(["friend1"]);
    await disconnectPromise;

    expect(socket._roomEmit).not.toHaveBeenCalledWith(
      ServertoClientEvents.FriendOffline,
      expect.anything(),
    );
  });

  it("emits FriendOffline and removes session if socket disconnects during markDeliveredMessages", async () => {
    const socket = createMockSocket("sock-1");
    let resolveMarkDelivered!: () => void;
    mockMarkDelivered.mockReturnValueOnce(
      new Promise((res) => {
        resolveMarkDelivered = () => res(undefined as any);
      }),
    );

    const setupPromise = setupUserSession(io, socket, store);

    // Wait for getFriendUids to resolve and FriendOnline to be emitted
    await vi.waitFor(() => {
      expect(socket._roomEmit).toHaveBeenCalledWith(
        ServertoClientEvents.FriendOnline,
        { uid: "user1" },
      );
    });

    // Simulate client disconnecting while markDeliveredMessages is in flight
    socket.connected = false;
    resolveMarkDelivered();
    await setupPromise;

    expect(store.getUser("user1")).toBeUndefined();
    expect(io.to).toHaveBeenCalledWith(["friend1", "friend2"]);
    expect(ioToEmit).toHaveBeenCalledWith(
      ServertoClientEvents.FriendOffline,
      { uid: "user1" },
    );
  });
});
