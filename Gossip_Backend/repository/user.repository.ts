import { SummarizationFormat } from "@gossip/shared";
import User, { IUserDocument } from "../models/user.model.js";
import { UserNotFoundError } from "../errors/index.js";

export async function findUserById(id: string) {
  const user = await User.findById(id);
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function findUserByEmail(email: string) {
  const user = await User.findOne({ email });
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function findUserByUid(uid: string) {
  const user = await User.findOne({ uid });
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function findUsersByUids(uids: string[]) {
  if (uids.length === 0) return [];
  return await User.find(
    { uid: { $in: uids } },
    { uid: 1, profile: 1, username: 1, _id: 0 },
  ).lean();
}

export type CreateUserInput = Omit<
  IUserDocument,
  "_id" | "createdAt" | "updatedAt" | "settings" | keyof Document
> & {
  settings?: IUserDocument["settings"]; // Make settings optional at creation time
};

export async function createUser(userData: CreateUserInput) {
  return await User.create(userData);
}

export async function searchUsers(query: string) {
  const trimmed = query.trim();
  return await User.find({
    $or: [
      { uid: { $regex: trimmed, $options: "i" } },
      { username: { $regex: trimmed, $options: "i" } },
      { firstname: { $regex: trimmed, $options: "i" } },
      { lastname: { $regex: trimmed, $options: "i" } },
    ],
  }).select("-_id -__v -Password");
}

export async function updateTranslationLanguage(id: string, language: string) {
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
  format: SummarizationFormat,
) {
  return await User.findByIdAndUpdate(
    id,
    { $set: { "settings.summarization.format": format } },
    { new: true },
  );
}
