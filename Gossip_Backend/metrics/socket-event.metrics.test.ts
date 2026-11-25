import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvents } from "@gossip/shared";
import { AppError } from "../errors/appError.js";
import { onSocketEvent } from "../utils/on-socket-event.js";
import { appErrorsTotal, register } from "./registry.js";
import {
  socketActiveEvents,
  socketEventDurationSeconds,
  socketEventErrorsTotal,
  socketEventsTotal,
} from "./socket.metrics.js";

describe("Socket Event Metrics (onSocketEvent)", () => {
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
    vi.spyOn(mockSocket, "emit");
  });

  async function emitAndWait(event: string, ...args: any[]): Promise<void> {
    const listeners = mockSocket.rawListeners(event);
    for (const listener of listeners) {
      await listener(...args);
    }
  }

  it("records success event count, duration, and active events gauge", async () => {
    let activeDuringExecution = 0;

    onSocketEvent(mockSocket, ClientToServerEvents.SendMessage, async () => {
      const active = await socketActiveEvents.get();
      activeDuringExecution = active.values[0].value;
    });

    await emitAndWait(
      ClientToServerEvents.SendMessage,
      { touid: "u2", message: "hi", type: "text" },
      vi.fn(),
    );

    expect(activeDuringExecution).toBe(1);

    const activeAfter = await socketActiveEvents.get();
    const events = await socketEventsTotal.get();
    const duration = await socketEventDurationSeconds.get();
    const countMetric = duration.values.find((v) =>
      v.metricName?.endsWith("_count"),
    );

    expect(activeAfter.values[0].value).toBe(0);
    expect(events.values[0].value).toBe(1);
    expect(events.values[0].labels).toEqual({
      event: ClientToServerEvents.SendMessage,
      status: "success",
    });
    expect(countMetric?.value).toBe(1);
  });

  it("records operational error metrics and app_errors_total with warn severity", async () => {
    const ack = vi.fn();

    onSocketEvent(mockSocket, ClientToServerEvents.SendMessage, async () => {
      throw new AppError("Empty message", 400, "EMPTY_MESSAGE", true);
    });

    await emitAndWait(
      ClientToServerEvents.SendMessage,
      { touid: "u2", message: "", type: "text" },
      ack,
    );

    const activeAfter = await socketActiveEvents.get();
    const events = await socketEventsTotal.get();
    const eventErrors = await socketEventErrorsTotal.get();
    const appErrors = await appErrorsTotal.get();

    expect(activeAfter.values[0].value).toBe(0);
    expect(events.values[0].labels).toEqual({
      event: ClientToServerEvents.SendMessage,
      status: "error",
    });
    expect(eventErrors.values[0].labels).toEqual({
      event: ClientToServerEvents.SendMessage,
      error_code: "EMPTY_MESSAGE",
      error_type: "operational",
    });
    expect(appErrors.values[0].labels).toEqual({
      source: "socket_event",
      severity: "warn",
    });
    expect(ack).toHaveBeenCalledOnce();
  });

  it("records unhandled error metrics and app_errors_total with error severity", async () => {
    onSocketEvent(mockSocket, ClientToServerEvents.SeenMessages, async () => {
      throw new Error("Database connection lost");
    });

    await emitAndWait(ClientToServerEvents.SeenMessages, { fromuid: "u1" });

    const eventErrors = await socketEventErrorsTotal.get();
    const appErrors = await appErrorsTotal.get();

    expect(eventErrors.values[0].labels).toEqual({
      event: ClientToServerEvents.SeenMessages,
      error_code: "INTERNAL_SERVER_ERROR",
      error_type: "unhandled",
    });
    expect(appErrors.values[0].labels).toEqual({
      source: "socket_event",
      severity: "error",
    });
    expect(mockSocket.emit).toHaveBeenCalledOnce();
  });
});
