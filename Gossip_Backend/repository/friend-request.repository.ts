import FriendRequest from "../models/friend-request.model.js";
import {
  FriendRequestStatus,
  type IFriendRequest,
} from "../types/friend-request.types.js";

export async function findFriendRequestBetween(uidA: string, uidB: string) {
  return await FriendRequest.findOne({
    $or: [
      { Sender_ID: uidA, Receiver_ID: uidB },
      { Sender_ID: uidB, Receiver_ID: uidA },
    ],
  });
}

export async function createFriendRequest(
  senderUid: string,
  receiverUid: string,
) {
  return await FriendRequest.create({
    Sender_ID: senderUid,
    Receiver_ID: receiverUid,
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
    Receiver_ID: receiverUid,
    status: FriendRequestStatus.PENDING,
  });
}
