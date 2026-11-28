import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { ImageUploadError } from "../errors/index.js";
import { simulateMockLatency } from "../utils/mock-delay.js";

export async function uploadImage(filePath: string): Promise<string> {
  try {
    if (env.mockUpload) {
      await fs.stat(filePath);
      await simulateMockLatency(env.mockUploadLatencyMs);
      return `https://mock-cdn.gossip.local/images/${nanoid(10)}.png`;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    return result.secure_url;
  } catch (e) {
    throw new ImageUploadError();
  }
}
