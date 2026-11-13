import mongoose, { Schema } from "mongoose";
import {
  FriendRequestStatus,
  IFriendRequest,
} from "../types/friend-request.types.js";

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    Sender_ID: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    Receiver_ID: {
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
