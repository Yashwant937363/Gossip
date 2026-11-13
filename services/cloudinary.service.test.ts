import { beforeEach, describe, expect, it, vi } from "vitest";
import cloudinary from "../config/cloudinary.js";
import { uploadImage } from "./cloudinary.service.js";

vi.mock("../config/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: vi.fn(),
    },
  },
}));

describe("uploadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upload an image with the correct parameters and return its URL", async () => {
    const filePath = "/tmp/test-image.png";
    const secureUrl = "https://res.cloudinary.com/demo/image/upload/test.png";

    vi.mocked(cloudinary.uploader.upload).mockResolvedValue({
      secure_url: secureUrl,
    } as Awaited<ReturnType<typeof cloudinary.uploader.upload>>);

    const result = await uploadImage(filePath);

    expect(cloudinary.uploader.upload).toHaveBeenCalledOnce();

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(filePath, {
      resource_type: "image",
    });

    expect(result).toBe(secureUrl);
  });

  it("should throw when Cloudinary upload fails", async () => {
    vi.mocked(cloudinary.uploader.upload).mockRejectedValue(
      new Error("Upload failed"),
    );

    await expect(uploadImage("/tmp/test-image.png")).rejects.toThrow(
      "Upload failed",
    );
  });
});
