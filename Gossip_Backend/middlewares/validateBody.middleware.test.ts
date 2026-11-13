// Unit Tests
// should call next() when req.body does match with zod schema
// should return 400 when req.body does not match with zod schema
// should return 500 when there is an unexpected error during validation

import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import * as z from "zod";
import { validateBody } from "./validateBody.middleware.js";
import { NextFunction, Request, Response } from "express";
import { Logger } from "pino";

describe("validateBody", () => {
  const testSchema = z.object({
    name: z.string("Name must be a string").min(1, "Name is required"),
    age: z
      .number("age should be a number")
      .int("age should be an integer")
      .positive("age should be a positive number"),
  });
  const safeParseSpy = vi.spyOn(testSchema, "safeParse");

  let mockLogger: {
    warn: Mock;
    error: Mock;
    info: Mock;
  };
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    req = {
      body: {},
      log: mockLogger as unknown as Logger,
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it("should call next() when req.body matches the zod schema", () => {
    const obj = { name: "John", age: 30 };
    req.body = obj;
    const middleware = validateBody(testSchema);
    middleware(req as Request, res as Response, next);

    expect(safeParseSpy).toHaveBeenCalledWith(obj);
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(req.body).toEqual(obj);
  });

  it.each([{ name: 4, age: 30 }, { name: "John", age: -5 }, { name: "Jane" }])(
    "should return 400 when req.body does not match the zod schema",
    (obj) => {
      req.body = obj;
      const middleware = validateBody(testSchema);
      middleware(req as Request, res as Response, next);

      expect(safeParseSpy).toHaveBeenCalledWith(obj);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid Request body",
          errors: expect.any(Array),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("should return 500 when there is an unexpected error during validation", () => {
    const obj = { name: "John", age: 30 };
    req.body = obj;
    const middleware = validateBody(testSchema);
    safeParseSpy.mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });
    middleware(req as Request, res as Response, next);

    expect(safeParseSpy).toHaveBeenCalledWith(obj);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Internal Server Error",
      }),
    );
    expect(mockLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
