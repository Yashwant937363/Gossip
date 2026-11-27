import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import * as cloudinaryService from "./cloudinary.service.js";
import { processAndUploadImage } from "./image.service.js";
import { ImageProcessingError } from "../errors/index.js";

describe("processAndUploadImage", () => {
  let tmpDir: string;
  let inputPath: string;
  let outputPath: string;

  const mockUploadImage = vi.spyOn(cloudinaryService, "uploadImage");

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gossip-img-test-"));
    inputPath = path.join(tmpDir, "input.png");
    outputPath = path.join(tmpDir, "output.png");

    await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toFile(inputPath);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("uploads processed image and cleans up both input and output files on success", async () => {
    mockUploadImage.mockResolvedValue("https://res.cloudinary.com/demo/avatar.png");

    const url = await processAndUploadImage(inputPath, outputPath);

    expect(url).toBe("https://res.cloudinary.com/demo/avatar.png");
    expect(mockUploadImage).toHaveBeenCalledWith(outputPath);

    await expect(fs.access(inputPath)).rejects.toThrow();
    await expect(fs.access(outputPath)).rejects.toThrow();
  });

  it("cleans up both input and output files even when upload fails", async () => {
    mockUploadImage.mockRejectedValue(new Error("Cloudinary down"));

    await expect(processAndUploadImage(inputPath, outputPath)).rejects.toThrow(
      ImageProcessingError,
    );

    await expect(fs.access(inputPath)).rejects.toThrow();
    await expect(fs.access(outputPath)).rejects.toThrow();
  });
});
