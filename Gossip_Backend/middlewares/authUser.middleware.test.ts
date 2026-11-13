// unit tests
// T1 - should call next when token is correct
//  - should call verifyToken with token
//  - set id properly in res.locals.id.
//  - called next only once with no paramerters.
// T2 - should return Unauthoirzed when token is missing
// T3 - should return Unauthorized when token is invalid
// T4 - should return Unauthorized when verifyToken throws an error
// T5 - should return Unauthorized when token format is invalid

import { beforeEach, describe, expect, it, vi } from "vitest";
import authUser from "./authUser.middleware.js";
import * as jwtService from "../services/jwt.service.js";
import { JsonWebTokenError } from "jsonwebtoken";

describe("authUser", () => {
  const payload = { id: "some-id" };
  let req: any, res: any, next: any;
  const mockVerifyToken = vi.spyOn(jwtService, "verifyToken");
  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {
        authorization: "Bearer user-token",
      },
      log: {
        warn: vi.fn(),
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    };
    next = vi.fn();
  });
  it("should call next when token is correct", () => {
    mockVerifyToken.mockReturnValue(payload);

    authUser(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith("user-token");
    expect(res.locals.id).toBe(payload.id);
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  it("should return Unauthorized when token is missing", () => {
    req.headers = {};

    authUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  it("should return Unauthorized when token is invalid", () => {
    mockVerifyToken.mockImplementation(() => {
      throw new JsonWebTokenError("invalid token");
    });

    authUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockVerifyToken).toHaveBeenCalledWith("user-token");
    expect(next).not.toHaveBeenCalled();
  });
  it("should return Unauthorized when verifyToken throws an error", () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error("some error");
    });

    authUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockVerifyToken).toHaveBeenCalledWith("user-token");
    expect(next).not.toHaveBeenCalled();
  });
  it("should return Unauthorized when token payload doesn't contain id", () => {
    mockVerifyToken.mockReturnValue({} as any);

    authUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockVerifyToken).toHaveBeenCalledWith("user-token");
    expect(next).not.toHaveBeenCalled();
  });
  it.each([
    ["invalid", "InvalidFormat"],
    ["only Bearer", "Bearer"],
    ["Bearer with a space", "Bearer "],
    ["starting with some thing else", "Basic abc123"],
    ["Empty String", ""],
  ])("should return Unauthorized when token format is %s", (_label, token) => {
    req.headers.authorization = token;

    authUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
