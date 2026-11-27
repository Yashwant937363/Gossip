import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvents } from "@gossip/shared";
import {
  onSocketEvent,
  waitForActiveEventsToDrain,
} from "./on-socket-event.js";
import { register } from "../metrics/registry.js";

describe("onSocketEvent draining & replacement guard", () => {
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    register.resetMetrics();

    const emitter = new EventEmitter();
    mockSocket = Object.assign(emitter, {
      data: {
        log: {
          warn: vi.fn(),
          error: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects new events with SESSION_REPLACED when socket.data.isReplacing is true", async () => {
    const handler = vi.fn();
    const ack = vi.fn();
    mockSocket.data.isReplacing = true;

    onSocketEvent(mockSocket, ClientToServerEvents.SendMessage, handler);

    const [listener] = mockSocket.rawListeners(ClientToServerEvents.SendMessage);
    await listener({ touid: "u2", message: "hello", type: "text" }, ack);

    expect(handler).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: "Session has been replaced by a newer login",
      code: "SESSION_REPLACED",
    });
  });

  it("resolves waitForActiveEventsToDrain immediately when no events are active", async () => {
    await expect(
      waitForActiveEventsToDrain(mockSocket, 5000),
    ).resolves.toBeUndefined();
  });

  it("waits until active event completes before resolving waitForActiveEventsToDrain", async () => {
    let resolveHandler!: () => void;
    let drained = false;

    onSocketEvent(mockSocket, ClientToServerEvents.SendMessage, () => {
      return new Promise<void>((res) => {
        resolveHandler = res;
      });
    });

    const [listener] = mockSocket.rawListeners(ClientToServerEvents.SendMessage);
    const eventPromise = listener(
      { touid: "u2", message: "hi", type: "text" },
      vi.fn(),
    );

    expect(mockSocket.data.activeEvents).toBe(1);

    const drainPromise = waitForActiveEventsToDrain(mockSocket, 5000).then(
      () => {
        drained = true;
      },
    );

    await Promise.resolve();
    expect(drained).toBe(false);

    resolveHandler();
    await eventPromise;
    await drainPromise;

    expect(drained).toBe(true);
    expect(mockSocket.data.activeEvents).toBe(0);
    expect(mockSocket.data.onEventsDrained).toBeUndefined();
  });

  it("resolves waitForActiveEventsToDrain on timeout if handler hangs and resolves only once", async () => {
    vi.useFakeTimers();
    let resolveCount = 0;

    onSocketEvent(
      mockSocket,
      ClientToServerEvents.SendMessage,
      () => new Promise(() => {}),
    );

    const [listener] = mockSocket.rawListeners(ClientToServerEvents.SendMessage);
    void listener({ touid: "u2", message: "hi", type: "text" }, vi.fn());

    const drainPromise = waitForActiveEventsToDrain(mockSocket, 5000).then(
      () => {
        resolveCount += 1;
      },
    );

    await vi.advanceTimersByTimeAsync(5000);
    await drainPromise;

    expect(resolveCount).toBe(1);
    expect(mockSocket.data.onEventsDrained).toBeUndefined();
  });
});
