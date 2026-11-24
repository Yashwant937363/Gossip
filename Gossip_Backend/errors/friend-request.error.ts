import { AppError } from "./appError.js";

export class InvalidUidError extends AppError {
  constructor(message = "Invalid UID") {
    super(message, 400, "INVALID_UID");
  }
}

export class AlreadyFriendsError extends AppError {
  constructor(message = "You are already friends") {
    super(message, 409, "ALREADY_FRIENDS");
  }
}

export class FriendRequestAlreadySentError extends AppError {
  constructor(message = "Friend request already sent") {
    super(message, 409, "FRIEND_REQUEST_ALREADY_SENT");
  }
}

export class IncomingFriendRequestExistsError extends AppError {
  constructor(message = "You already have a friend request from this user") {
    super(message, 409, "INCOMING_FRIEND_REQUEST_EXISTS");
  }
}

export class FriendRequestNotFoundError extends AppError {
  constructor(message = "Friend request not found") {
    super(message, 404, "FRIEND_REQUEST_NOT_FOUND");
  }
}

export class InvalidRequestRecipientError extends AppError {
  constructor(
    message = "You cannot answer a friend request sent to another user",
  ) {
    super(message, 403, "INVALID_REQUEST_RECIPIENT");
  }
}
