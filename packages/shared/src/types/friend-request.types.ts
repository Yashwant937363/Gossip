export enum FriendRequestStatus {
  PENDING = "Pending",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
}

export interface IFriendRequest {
  Sender_ID: string;
  Receiver_ID: string;
  status: FriendRequestStatus;
}
