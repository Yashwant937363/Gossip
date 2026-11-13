import User from "../models/user.model.js";
import type { IUser } from "../types/user.types.js";

export async function findUserById(id: string) {
  return await User.findById(id);
}

export async function findUserByEmail(email: string) {
  return await User.findOne({ Email: email });
}

export async function findUserByUid(uid: string) {
  return await User.findOne({ uid });
}

export async function findUsersByUids(uids: string[]) {
  if (uids.length === 0) return [];
  return await User.find(
    { uid: { $in: uids } },
    { uid: 1, ProfilePicture: 1, Username: 1, _id: 0 },
  ).lean();
}

export async function createUser(userData: Partial<IUser>) {
  return await User.create(userData);
}

export async function searchUsers(query: string) {
  const trimmed = query.trim();
  return await User.find({
    $or: [
      { uid: { $regex: trimmed, $options: "i" } },
      { Username: { $regex: trimmed, $options: "i" } },
      { FirstName: { $regex: trimmed, $options: "i" } },
      { LastName: { $regex: trimmed, $options: "i" } },
    ],
  }).select("-_id -__v -Password");
}

export async function updateTranslationLanguage(
  id: string,
  language: string,
) {
  return await User.findByIdAndUpdate(
    id,
    { $set: { "settings.translation.language": language } },
    { new: true },
  );
}

export async function updateAlwaysTranslate(
  id: string,
  alwaysTranslate: boolean,
) {
  return await User.findByIdAndUpdate(
    id,
    { $set: { "settings.translation.alwaysTranslate": alwaysTranslate } },
    { new: true },
  );
}

export async function updateSummarizationFormat(
  id: string,
  format: "paragraph" | "bullet_points",
) {
  return await User.findByIdAndUpdate(
    id,
    { $set: { "settings.summarization.format": format } },
    { new: true },
  );
}
