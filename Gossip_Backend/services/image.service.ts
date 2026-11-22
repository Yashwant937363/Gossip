import sharp from "sharp";
import { uploadImage } from "./cloudinary.service.js";
import { ImageProcessingError } from "../errors/index.js";

export const processAndUploadImage = async (
  inputImagePath: string,
  outputImagePath: string,
) => {
  try {
    await sharp(inputImagePath)
      .resize({
        width: 400,
        height: 400,
        fit: "cover",
        withoutEnlargement: true,
      })
      .png()
      .toFile(outputImagePath);

    return await uploadImage(outputImagePath);
  } catch (error) {
    throw new ImageProcessingError();
  }
};
