import { SearchUserItem } from "../schemas/user.schema";

export enum FriendRequestStatus {
  PENDING = "Pending",
  ACCEPTED = "Accepted",
}

export interface IFriendRequest {
  senderUid: string;
  receiverUid: string;
  status: FriendRequestStatus;
}

export interface SearchUsersResponse {
  users: SearchUserItem[];
}
