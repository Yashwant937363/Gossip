import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEmailOtp, sendEmailOtp } from "./email.service.js";

describe("Email Service", () => {
  describe("generateEmailOtp", () => {
    it("should return a string", () => {
      const otp = generateEmailOtp();

      expect(typeof otp).toBe("string");
    });

    it("should return a 6-digit OTP", () => {
      const otp = generateEmailOtp();

      expect(otp).toMatch(/^\d{6}$/);
    });
    it("should return 100000 when the random value is 0", () => {
      const otp = Number(generateEmailOtp(() => 0));
      expect(otp).toBe(100000);
    });
    it("should return 999999 when the random value is 0.999999", () => {
      const otp = Number(generateEmailOtp(() => 0.999999));
      expect(otp).toBe(999999);
    });
    it("should generate an OTP within the valid range", () => {
      const otp = Number(generateEmailOtp());

      expect(otp).toBeGreaterThanOrEqual(100000);
      expect(otp).toBeLessThanOrEqual(999999);
    });
  });
  describe("sendEmailOtps", () => {
    afterEach(() => vi.clearAllMocks());
    const sendMail = vi.fn().mockResolvedValue(undefined);

    const senderEmail = "sender@example.com";
    const recipientEmail = "user@example.com";
    const otp = "123456";
    const mockMailer = { sendMail };
    it("should send an OTP email with the correct details", async () => {
      await sendEmailOtp(recipientEmail, otp, senderEmail, mockMailer as never);
      expect(sendMail).toHaveBeenCalledOnce();

      expect(sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: recipientEmail,
        subject: "Your One-Time Password (OTP) for Verification",
        text: expect.stringContaining(otp),
        html: expect.stringContaining(otp),
      });
    });
    it("should throw when sending the email fails", async () => {
      const error = new Error("SMTP connection failed");

      const mockMailer = {
        sendMail: vi.fn().mockRejectedValue(error),
      };

      await expect(
        sendEmailOtp(recipientEmail, otp, senderEmail, mockMailer as never),
      ).rejects.toThrow("SMTP connection failed");
    });
  });
});
