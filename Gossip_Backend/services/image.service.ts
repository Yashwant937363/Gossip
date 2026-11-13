import sharp from "sharp";
import { uploadImage } from "./cloudinary.service.js";

export const processAndUploadImage = async (
  inputImagePath: string,
  outputImagePath: string,
) => {
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
};
