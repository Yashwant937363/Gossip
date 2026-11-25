import { addFriend, getFriendUids } from "../repository/friend.repository.js";
import {
  createFriendRequest,
  findFriendRequestBetween,
} from "../repository/friend-request.repository.js";
import { markDeliveredMessages } from "../repository/chat.repository.js";
import type { UserStore } from "../store/sessionStore.js";
import {
  ClientToServerEvents,
  ClientToServerEventsTypes,
  FriendRequestStatus,
  ServertoClientEvents,
  socketError,
  socketSuccess,
} from "@gossip/shared";
import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";
import { onSocketEvent } from "../utils/on-socket-event.js";
import {
  AlreadyFriendsError,
  FriendRequestAlreadySentError,
  FriendRequestNotFoundError,
  IncomingFriendRequestExistsError,
  InvalidRequestRecipientError,
  InvalidUidError,
} from "../errors/friend-request.error.js";

/**
 * Automatically initializes the session when an authenticated socket connects.
 * Called automatically from index.ts upon connection
 */
export async function setupUserSession(
  socket: TypedSocket,
  usersStore: UserStore,
): Promise<void> {
  try {
    const user = socket.data.user;
    const uid = socket.data.uid;

    usersStore.saveUser(uid, {
      ...user,
      online: true,
    });

    socket.join(uid);

    const friendUids = await getFriendUids(uid);
    socket.to(friendUids).emit(ServertoClientEvents.FriendOnline, { uid });
    socket.data.log.info("Setuped User Session");
    await markDeliveredMessages(uid);
  } catch (error) {
    socket.data.log.error(error, "Error setting up user socket session:");
  }
}

export default function registerUserHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const sendRequestUser: ClientHandler<
    ClientToServerEvents.SendChatRequest
  > = async ({ fromuid, touid }, ack) => {
    if (fromuid.length !== 5 || touid.length !== 5) {
      throw new InvalidUidError();
    }

    const friend = await findFriendRequestBetween(fromuid, touid);
    if (friend && friend.status === FriendRequestStatus.ACCEPTED) {
      throw new AlreadyFriendsError();
    }
    if (friend && friend.status === FriendRequestStatus.PENDING) {
      if (friend.senderUid === fromuid) {
        throw new FriendRequestAlreadySentError();
      } else {
        throw new IncomingFriendRequestExistsError();
      }
    }
    const fromUserUID = socket.data.uid;
    const toUser = usersStore.getUser(touid);
    await createFriendRequest(fromUserUID, touid);
    if (toUser?.uid) {
      socket.to(toUser.uid).emit(ServertoClientEvents.RequestFromUser, {
        uid: fromUserUID,
        profile: socket.data.user.profile,
        username: socket.data.user.username,
      });
    }
    socket.data.log.info({ fromuid, touid }, "Request Sended Successfully");
    ack(socketSuccess());
  };

  const requestAnswer: ClientHandler<
    ClientToServerEvents.RequestAnswer
  > = async ({ fromuid, touid, answer }, ack) => {
    if (touid !== socket.data.uid) {
      throw new InvalidRequestRecipientError();
    }
    const friendReq = await findFriendRequestBetween(fromuid, touid);
    if (!friendReq) {
      throw new FriendRequestNotFoundError();
    }
    if (friendReq.status === FriendRequestStatus.ACCEPTED) {
      throw new AlreadyFriendsError();
    }
    if (answer) {
      friendReq.status = FriendRequestStatus.ACCEPTED;
      await addFriend(fromuid, touid);
      await friendReq.save();
      const { settings, ...user } = socket.data.user;
      socket.to(fromuid).emit(ServertoClientEvents.SuccessMessage, {
        msg: "Request Accepted by " + socket.data.user.username,
        user: user,
      });
    } else {
      await friendReq.deleteOne();
      socket
        .to(fromuid)
        .emit(
          ServertoClientEvents.ErrorMessage,
          "Request Rejected by " + socket.data.user.username,
        );
    }
    socket.data.log.info({ reqId: friendReq.id }, "Requst Cycle Completed");
    ack(socketSuccess());
  };

  const handleDisconnect = async (reason: any) => {
    const uid = socket.data.uid;

    const friendUids = await getFriendUids(uid);
    friendUids.forEach((friendUid) => {
      socket.to(friendUid).emit(ServertoClientEvents.FriendOffline, { uid });
    });
    usersStore.userDisconnected(uid);

    socket.data.log.warn({ reason }, "User Disconnected");
  };

  onSocketEvent(socket, ClientToServerEvents.SendChatRequest, sendRequestUser);
  onSocketEvent(socket, ClientToServerEvents.RequestAnswer, requestAnswer);
  socket.on("disconnect", handleDisconnect);
}
