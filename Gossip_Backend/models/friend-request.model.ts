import mongoose, { Schema } from "mongoose";
import { FriendRequestStatus, IFriendRequest } from "@gossip/shared";

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    senderUid: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    receiverUid: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FriendRequestStatus),
      default: FriendRequestStatus.PENDING,
    },
  },
  { timestamps: true },
);

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;
