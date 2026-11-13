import mongoose, { Schema } from "mongoose";

export interface IFriend {
  user1: string;
  user2: string;
  createdAt: Date;
}

const friendSchema = new Schema<IFriend>(
  {
    user1: { type: String, required: true, index: true },
    user2: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

// Compound unique index prevents any duplicate friendship
friendSchema.index({ user1: 1, user2: 1 }, { unique: true });

friendSchema.pre("validate", function (next) {
  if (this.user1 === this.user2) {
    return next(new Error("Cannot create a friendship with the same user"));
  }

  if (this.user1 && this.user2 && this.user1 > this.user2) {
    const temp = this.user1;
    this.user1 = this.user2;
    this.user2 = temp;
  }

  next();
});

export const Friend = mongoose.model("Friend", friendSchema);
