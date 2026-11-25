import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSocket } from "../middlewares/authSocket.middleware.js";
import * as jwtService from "../services/jwt.service.js";
import * as userRepository from "../repository/user.repository.js";
import { register } from "./registry.js";
import {
  recordSocketConnect,
  recordSocketDisconnect,
  socketActiveConnections,
  socketConnectedTotal,
  socketConnectionDurationSeconds,
  socketConnectionErrorsTotal,
  socketConnectionsTotal,
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

  it("tracks active connections, total connected, and session duration on connect/disconnect", async () => {
    recordSocketConnect();

    const activeDuring = await socketActiveConnections.get();
    const connected = await socketConnectedTotal.get();
    expect(activeDuring.values[0].value).toBe(1);
    expect(connected.values[0].value).toBe(1);

    recordSocketDisconnect(42.5);

    const activeAfter = await socketActiveConnections.get();
    const duration = await socketConnectionDurationSeconds.get();
    const countMetric = duration.values.find((v) =>
      v.metricName?.endsWith("_count"),
    );

    expect(activeAfter.values[0].value).toBe(0);
    expect(countMetric?.value).toBe(1);
  });
});
