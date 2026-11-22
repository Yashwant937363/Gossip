import cloudinary from "../config/cloudinary.js";
import { ImageUploadError } from "../errors/index.js";

export async function uploadImage(filePath: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    return result.secure_url;
  } catch (e) {
    throw new ImageUploadError();
  }
}
