import { Friend } from "../models/friend.model.js";

export async function addFriend(uidA: string, uidB: string) {
  const [user1, user2] = uidA < uidB ? [uidA, uidB] : [uidB, uidA];
  return await Friend.create({ user1, user2 });
}

export async function isFriend(uidA: string, uidB: string): Promise<boolean> {
  const [user1, user2] = uidA < uidB ? [uidA, uidB] : [uidB, uidA];
  const exists = await Friend.exists({ user1, user2 });
  return Boolean(exists);
}

export async function getFriendUids(uid: string): Promise<string[]> {
  const friendships = await Friend.find({
    $or: [{ user1: uid }, { user2: uid }],
  });
  return friendships.map((f) => (f.user1 === uid ? f.user2 : f.user1));
}

export async function removeFriend(uidA: string, uidB: string) {
  const [user1, user2] = uidA < uidB ? [uidA, uidB] : [uidB, uidA];
  return await Friend.deleteOne({ user1, user2 });
}
