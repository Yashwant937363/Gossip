import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSocket } from "../middlewares/authSocket.middleware.js";
import * as jwtService from "../services/jwt.service.js";
import * as userRepository from "../repository/user.repository.js";
import { register } from "./registry.js";
import {
  recordSocketConnect,
  recordSocketDisconnect,
  recordSocketHandshakeDuration,
  socketActiveConnections,
  socketConnectedTotal,
  socketConnectionErrorsTotal,
  socketConnectionsTotal,
  socketHandshakeDurationSeconds,
} from "./socket.metrics.js";

describe("Socket Connection Metrics", () => {
  const mockVerifyToken = vi.spyOn(jwtService, "verifyToken");
  const mockFindById = vi.spyOn(userRepository, "findUserById");

  beforeEach(() => {
    vi.clearAllMocks();
    register.resetMetrics();
  });

  it("increments connection attempts and errors when token is missing", async () => {
    const socket: any = { handshake: { auth: {} }, data: {} };
    const next = vi.fn();

    await authSocket(socket, next);

    const attempts = await socketConnectionsTotal.get();
    const errors = await socketConnectionErrorsTotal.get();

    expect(attempts.values[0].value).toBe(1);
    expect(errors.values[0].value).toBe(1);
    expect(errors.values[0].labels).toEqual({ reason: "missing_token" });
  });

  it("increments connection errors with invalid_token when JWT fails", async () => {
    const socket: any = {
      handshake: { auth: { token: "Bearer bad-token" } },
      data: {},
    };
    const next = vi.fn();
    mockVerifyToken.mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    await authSocket(socket, next);

    const errors = await socketConnectionErrorsTotal.get();
    expect(errors.values[0].value).toBe(1);
    expect(errors.values[0].labels).toEqual({ reason: "invalid_token" });
  });

  it("increments connection errors with user_not_found when user does not exist", async () => {
    const socket: any = {
      handshake: { auth: { token: "Bearer valid-token" } },
      data: {},
    };
    const next = vi.fn();
    mockVerifyToken.mockReturnValue({ id: "missing-user" });
    mockFindById.mockResolvedValue(null as any);

    await authSocket(socket, next);

    const errors = await socketConnectionErrorsTotal.get();
    expect(errors.values[0].value).toBe(1);
    expect(errors.values[0].labels).toEqual({ reason: "user_not_found" });
  });

  it("tracks active connections and total connected on connect/disconnect", async () => {
    recordSocketConnect();

    const activeDuring = await socketActiveConnections.get();
    const connected = await socketConnectedTotal.get();
    expect(activeDuring.values[0].value).toBe(1);
    expect(connected.values[0].value).toBe(1);

    recordSocketDisconnect();

    const activeAfter = await socketActiveConnections.get();
    expect(activeAfter.values[0].value).toBe(0);
  });

  it("records handshake start timestamp in authSocket and observes handshake duration", async () => {
    const socket: any = {
      handshake: { auth: { token: "Bearer valid-token" } },
      data: {},
    };
    const next = vi.fn();
    mockVerifyToken.mockReturnValue({ id: "user-1" });
    mockFindById.mockResolvedValue({
      _id: { toString: () => "user-1" },
      uid: "u1234",
      profile: "",
      username: "Alice",
      settings: {},
    } as any);

    await authSocket(socket, next);
    expect(typeof socket.data.handshakeStartedAt).toBe("bigint");
    expect(next).toHaveBeenCalledWith();

    recordSocketHandshakeDuration(0.042);
    const handshakeMetric = await socketHandshakeDurationSeconds.get();
    const countMetric = handshakeMetric.values.find((v) =>
      v.metricName?.endsWith("_count"),
    );
    expect(countMetric?.value).toBe(1);
  });
});
