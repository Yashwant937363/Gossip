import { addFriend, getFriendUids } from "../repository/friend.repository.js";
import {
  createFriendRequest,
  findFriendRequestBetween,
} from "../repository/friend-request.repository.js";
import { markDeliveredMessages } from "../repository/chat.repository.js";
import type { UserStore } from "../store/sessionStore.js";
import {
  ClientToServerEvents,
  FriendRequestStatus,
  ServertoClientEvents,
  socketSuccess,
} from "@gossip/shared";
import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";
import {
  onSocketEvent,
  waitForActiveEventsToDrain,
} from "../utils/on-socket-event.js";
import {
  AlreadyFriendsError,
  FriendRequestAlreadySentError,
  FriendRequestNotFoundError,
  IncomingFriendRequestExistsError,
  InvalidRequestRecipientError,
  InvalidUidError,
} from "../errors/friend-request.error.js";

const DRAIN_TIMEOUT_MS = 5000;

async function retireReplacedSocket(
  io: TypedServer,
  oldSocket: TypedSocket,
): Promise<void> {
  try {
    oldSocket.data.isReplacing = true;
    oldSocket.leave?.(oldSocket.data.uid);
    await waitForActiveEventsToDrain(oldSocket, DRAIN_TIMEOUT_MS);
    console.log("Old socket: ", oldSocket.id);
    io.to(oldSocket.id).emit(
      ServertoClientEvents.ErrorMessage,
      "You have been logged in from another session",
    );
    oldSocket.disconnect(true);
  } catch (error) {
    oldSocket.data.log?.error(error, "Error retiring replaced socket:");
  }
}

/**
 * Automatically initializes the session when an authenticated socket connects.
 * Enforces single active session per user (latest session wins) and drains
 * any active events on the previous socket before disconnecting it.
 */
export async function setupUserSession(
  io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): Promise<void> {
  const user = socket.data.user;
  const uid = socket.data.uid;

  try {
    const existingSocketId = usersStore.getSocketId(uid);
    const wasAlreadyOnline = Boolean(existingSocketId);

    usersStore.saveUser(
      uid,
      {
        ...user,
        online: true,
      },
      socket.id,
    );

    if (existingSocketId && existingSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      console.log(oldSocket?.id, socket.id);
      if (oldSocket) {
        oldSocket.data.isReplacing = true;
        void retireReplacedSocket(io, oldSocket);
      }
    }

    socket.join(uid);

    const friendUids = await getFriendUids(uid);

    if (!socket.connected || usersStore.getSocketId(uid) !== socket.id) {
      if (!socket.connected) {
        usersStore.userDisconnected(uid, socket.id);
      }
      return;
    }

    if (!wasAlreadyOnline) {
      socket.to(friendUids).emit(ServertoClientEvents.FriendOnline, { uid });
    }

    socket.data.log.info("Setuped User Session");
    await markDeliveredMessages(uid);

    if (!(socket.connected as boolean)) {
      usersStore.userDisconnected(uid, socket.id);
    }
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

  const handleDisconnect = async (reason: unknown) => {
    const uid = socket.data.uid;
    const shouldMarkOffline = usersStore.userDisconnected(uid, socket.id);

    if (!shouldMarkOffline) {
      socket.data.log.info(
        { reason },
        "Stale or replaced socket disconnected; keeping active session online",
      );
      return;
    }

    try {
      await waitForActiveEventsToDrain(socket, DRAIN_TIMEOUT_MS);

      const friendUids = await getFriendUids(uid);
      if (usersStore.getUser(uid)) {
        return;
      }

      friendUids.forEach((friendUid) => {
        socket.to(friendUid).emit(ServertoClientEvents.FriendOffline, { uid });
      });

      socket.data.log.warn({ reason }, "User Disconnected");
    } catch (error) {
      socket.data.log.error(error, "Error during socket disconnect cleanup:");
    }
  };

  onSocketEvent(socket, ClientToServerEvents.SendChatRequest, sendRequestUser);
  onSocketEvent(socket, ClientToServerEvents.RequestAnswer, requestAnswer);
  socket.on("disconnect", handleDisconnect);
}
