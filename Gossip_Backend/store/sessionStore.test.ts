import { beforeEach, describe, expect, it } from "vitest";
import { ServerUserStore } from "./sessionStore.js";

describe("ServerUserStore", () => {
  let store: ServerUserStore;

  const baseSession = {
    uid: "user1",
    username: "alice",
    profile: "avatar.png",
    online: true,
    settings: {
      translation: { alwaysTranslate: false, language: "en" },
      summarization: { format: "bullet" as const },
    },
  };

  beforeEach(() => {
    store = new ServerUserStore();
  });

  it("saves user session with socketId and retrieves it via getUser and getSocketId", () => {
    store.saveUser("user1", baseSession, "socket-1");

    expect(store.getSocketId("user1")).toBe("socket-1");
    expect(store.getUser("user1")).toEqual({
      ...baseSession,
      socketId: "socket-1",
    });
  });

  it("does not remove session and returns false when disconnecting with a stale socketId", () => {
    store.saveUser("user1", baseSession, "socket-2");

    const removed = store.userDisconnected("user1", "socket-1");

    expect(removed).toBe(false);
    expect(store.getSocketId("user1")).toBe("socket-2");
    expect(store.getUser("user1")).toBeDefined();
  });

  it("removes session and returns true when disconnecting with the matching socketId", () => {
    store.saveUser("user1", baseSession, "socket-2");

    const removed = store.userDisconnected("user1", "socket-2");

    expect(removed).toBe(true);
    expect(store.getSocketId("user1")).toBeUndefined();
    expect(store.getUser("user1")).toBeUndefined();
  });

  it("returns false when disconnecting an unknown user", () => {
    expect(store.userDisconnected("missing", "socket-1")).toBe(false);
  });
});
