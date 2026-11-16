// unit tests
// should call next function after get authenticated

// should call next function with error when token is missing in header
// should call next function with error when token is missing inside header's string
// should call next function with error when token payload is invalid
// should call next function with error when user not found
// should call next function with error when token is invalid or any function throws an error.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as jwtService from "../services/jwt.service.js";
import User from "../models/user.model.js";
import type { JWTPayload } from "../types/auth.types.js";
import { authSocket } from "./authSocket.middleware.js";

describe("authSocket", () => {
  let socket: any;
  const next = vi.fn();

  // Mock data
  const user: any = {
    _id: "some-id",
    uid: "abcde",
    profile: "fake-profile-pic-url",
    username: "testuser",
    settings: {},
  };

  const jwtPayload: JWTPayload = {
    id: "some-id",
  };

  // Spies
  const mockVerifyToken = vi.spyOn(jwtService, "verifyToken");
  const mockFindById = vi.spyOn(User, "findById");

  beforeEach(() => {
    socket = {
      handshake: {
        auth: {
          token: "Bearer valid-token",
        },
      },
      data: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should authenticate successfully, attach user information to socket.data and call next()", async () => {
    mockVerifyToken.mockReturnValue(jwtPayload);
    mockFindById.mockResolvedValue(user);

    await authSocket(socket, next);

    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
    expect(mockFindById).toHaveBeenCalledWith("some-id");

    expect(socket.data.id).toBe("some-id");
    expect(socket.data.uid).toBe("abcde");
    expect(socket.data.user).toEqual({
      online: true,
      profile: user.profile,
      username: user.username,
      settings: user.settings,
      uid: user.uid,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next(error) when token is missing", async () => {
    socket.handshake.auth.token = undefined;

    await authSocket(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: Missing token",
      }),
    );

    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });
  it.each([
    ["invalid", "InvalidFormatToken"],
    ["only Bearer", "Bearer"],
    ["Bearer with a space", "Bearer "],
    ["starting with some thing else", "Basic abc123"],
    ["Empty String", ""],
  ])(
    "should call next(error) when token format is %s",
    async (_label, token) => {
      socket.handshake.auth.token = token;

      await authSocket(socket, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication error: Missing token",
        }),
      );

      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockFindById).not.toHaveBeenCalled();
    },
  );

  it("should call next(error) when token contains only whitespace", async () => {
    socket.handshake.auth.token = "   ";

    await authSocket(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: Missing token",
      }),
    );

    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("should call next(error) when token payload is invalid", async () => {
    mockVerifyToken.mockReturnValue({} as any);

    await authSocket(socket, next);

    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: Invalid token payload",
      }),
    );

    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("should call next(error) when user is not found", async () => {
    mockVerifyToken.mockReturnValue(jwtPayload);
    mockFindById.mockResolvedValue(null as any);

    await authSocket(socket, next);

    expect(mockFindById).toHaveBeenCalledWith("some-id");

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: User not found",
      }),
    );
  });

  it("should call next(error) when token verification throws an error", async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error("Invalid JWT");
    });

    await authSocket(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: Invalid or expired token",
      }),
    );

    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("should call next(error) when database lookup throws an error", async () => {
    mockVerifyToken.mockReturnValue(jwtPayload);

    mockFindById.mockImplementation(() => {
      throw new Error("Database error");
    });

    await authSocket(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication error: Invalid or expired token",
      }),
    );
  });
});
