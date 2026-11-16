import FriendRequest from "../models/friend-request.model.js";
import { FriendRequestStatus } from "@gossip/shared";

export async function findFriendRequestBetween(uidA: string, uidB: string) {
  return await FriendRequest.findOne({
    $or: [
      { senderUid: uidA, receiverUid: uidB },
      { senderUid: uidB, receiverUid: uidA },
    ],
  });
}

export async function createFriendRequest(
  senderUid: string,
  receiverUid: string,
) {
  return await FriendRequest.create({
    senderUid: senderUid,
    receiverUid: receiverUid,
    status: FriendRequestStatus.PENDING,
  });
}

export async function updateFriendRequestStatus(
  requestId: string,
  status: FriendRequestStatus,
) {
  return await FriendRequest.findByIdAndUpdate(
    requestId,
    { status },
    { new: true },
  );
}

export async function getPendingRequestsForUser(receiverUid: string) {
  return await FriendRequest.find({
    receiverUid,
    status: FriendRequestStatus.PENDING,
  });
}
