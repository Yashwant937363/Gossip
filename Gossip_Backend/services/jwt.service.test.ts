import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../config/env.js", () => ({
  env: { jwtSecret: "test-default-secret" },
}));

import { generateToken, verifyToken } from "./jwt.service.js";

const payload = { userId: "123", role: "admin" };

describe("generateToken / verifyToken", () => {
  it("should return data when token is correct with default secret", () => {
    const token = generateToken(payload, undefined, { expiresIn: "1h" });

    // verify with the default secret (verifyToken's default is used)
    const decoded = verifyToken<typeof payload & { iat: number; exp: number }>(
      token,
    );
    expect(decoded).toMatchObject(payload);

    // should use default secret when secret parameter is omitted
    // (explicitly verifying with env.jwtSecret only passes if generateToken used it)
    expect(verifyToken(token, "test-default-secret")).toMatchObject(payload);

    // should add an exp claim when expiresIn option is provided
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it("should return data when token is correct with custom secret", () => {
    const token = generateToken(payload, "custom-secret");
    const decoded = verifyToken<typeof payload>(token, "custom-secret");

    expect(decoded).toMatchObject(payload);
  });

  it("should throw error when token is expired", () => {
    const token = generateToken(payload, undefined, { expiresIn: -10 });

    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
  });

  it("should throw error when payload is tampered", () => {
    const token = generateToken(payload);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: "999", role: "admin" }),
    ).toString("base64url");

    expect(() =>
      verifyToken(`${header}.${forgedPayload}.${signature}`),
    ).toThrow(jwt.JsonWebTokenError);
  });

  it("should throw when verifying with a different secret", () => {
    const token = generateToken(payload, "secret-a");

    expect(() => verifyToken(token, "secret-b")).toThrow(jwt.JsonWebTokenError);
  });

  it("should throw when the token is malformed", () => {
    expect(() => verifyToken("not-a-token")).toThrow(jwt.JsonWebTokenError);
  });
});
