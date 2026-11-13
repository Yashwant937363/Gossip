import { describe, it, expect, vi, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { getHash, compareHash } from "./bcrypt.service.js";

describe("Bcrypt Service", () => {
  const rounds = 4; // for faster execution
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should return true when passworld is right", async () => {
    const password = "12345678";
    const hash = await getHash(password, rounds);

    const result = await compareHash(password, hash);

    expect(result).toBe(true);
  });
  it("should return false when password is wrong", async () => {
    const password = "12345678";
    const tamperedPassword = "23456789";
    const hash = await getHash(password, rounds);

    const result = await compareHash(tamperedPassword, hash);

    expect(result).toBe(false);
  });

  describe("getHash()", () => {
    it("should generate hash for the given data", async () => {
      // Arrange
      const saltSpy = vi
        .spyOn(bcrypt, "genSalt")
        .mockResolvedValue("mocked_salt" as never);
      const hashSpy = vi
        .spyOn(bcrypt, "hash")
        .mockResolvedValue("mocked_hash" as never);
      const rounds = 5;
      // Act
      const result = await getHash("password123", rounds);

      // Assert
      expect(result).toBe("mocked_hash");
      expect(saltSpy).toHaveBeenCalledWith(rounds);
      expect(hashSpy).toHaveBeenCalledWith("password123", "mocked_salt");
    });
    it("should use default 10 rounds when rounds argument is omitted", async () => {
      const saltSpy = vi
        .spyOn(bcrypt, "genSalt")
        .mockResolvedValue("mocked_salt" as never);
      vi.spyOn(bcrypt, "hash").mockResolvedValue("mocked_hash" as never);

      await getHash("password123");

      expect(saltSpy).toHaveBeenCalledWith(10);
    });
    it("should propagate errors from bcrypt", async () => {
      // Arrange
      vi.spyOn(bcrypt, "genSalt").mockRejectedValue(
        new Error("Salt failed") as never,
      );

      // Act + Assert
      await expect(getHash("password123")).rejects.toThrow("Salt failed");
    });
  });

  describe("compareHash()", () => {
    it("should return true when data matches hash", async () => {
      // Arrange
      const compareSpy = vi
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      // Act
      const result = await compareHash("password123", "mocked_hash");

      // Assert
      expect(result).toBe(true);
      expect(compareSpy).toHaveBeenCalledWith("password123", "mocked_hash");
    });
    it("should return false when data does not match hash", async () => {
      // Arrange
      const compareSpy = vi
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(false as never);

      // Act
      const result = await compareHash("password123", "mocked_hash");

      // Assert
      expect(result).toBe(false);
      expect(compareSpy).toHaveBeenCalledWith("password123", "mocked_hash");
    });

    it("should propagate errors from bcrypt", async () => {
      // Arrange
      vi.spyOn(bcrypt, "compare").mockRejectedValue(
        new Error("Compare failed") as never,
      );

      // Act + Assert
      await expect(compareHash("password123", "mocked_hash")).rejects.toThrow(
        "Compare failed",
      );
    });
  });
});
