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
} from "@gossip/shared";
import type { TypedServer, TypedSocket } from "../types/socket.types.js";

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
    friendUids.forEach((friendUid) => {
      socket.to(friendUid).emit(ServertoClientEvents.FriendOnline, { uid });
    });

    await markDeliveredMessages(uid);
  } catch (error) {
    console.error("Error setting up user socket session:", error);
  }
}

export default function registerUserHandlers(
  _io: TypedServer,
  socket: TypedSocket,
  usersStore: UserStore,
): void {
  const sendRequestUser = async (
    fromuid: string,
    touid: string,
    userfeedback: (msg: string) => void,
  ) => {
    if (fromuid.length !== 5 || touid.length !== 5) {
      userfeedback("Invalid Uid");
      return;
    }

    const friend = await findFriendRequestBetween(fromuid, touid);
    if (friend && friend.status === FriendRequestStatus.ACCEPTED) {
      userfeedback("Your Already Friends");
      return;
    }
    if (friend && friend.status === FriendRequestStatus.PENDING) {
      if (friend.senderUid === fromuid) {
        userfeedback("Request Already Sent");
      } else {
        userfeedback("You Already Have a Request from this User");
      }
      return;
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
    userfeedback("Request Sent");
  };

  const requestAnswer = async (
    {
      fromuid,
      touid,
      answer,
    }: {
      fromuid: string;
      touid: string;
      answer: boolean;
    },
    userfeedback: (msg: string | null) => void,
  ) => {
    if (touid !== socket.data.uid) {
      userfeedback("Invalid Request");
      return;
    }
    const friend = await findFriendRequestBetween(fromuid, touid);
    if (!friend) {
      userfeedback("You Don't Have a Request from this User");
      return;
    }
    if (friend.status === FriendRequestStatus.REJECTED) {
      userfeedback("Request Already Rejected");
      return;
    }
    if (friend && friend.status === FriendRequestStatus.ACCEPTED) {
      userfeedback("Your Already Friends");
      return;
    }
    if (answer) {
      friend.status = FriendRequestStatus.ACCEPTED;
      await addFriend(fromuid, touid);
      await friend.save();
      const { settings, ...user } = socket.data.user;
      socket.to(fromuid).emit(ServertoClientEvents.SuccessMessage, {
        msg: "Request Accepted by " + socket.data.user.username,
        user: user,
      });
    } else {
      socket
        .to(fromuid)
        .emit(
          ServertoClientEvents.ErrorMessage,
          "Request Rejected by " + socket.data.user.username,
        );
      friend.status = FriendRequestStatus.REJECTED;
      await friend.save();
    }
  };

  const handleDisconnect = async () => {
    const uid = socket.data.uid;
    if (uid) {
      const friendUids = await getFriendUids(uid);
      friendUids.forEach((friendUid) => {
        socket.to(friendUid).emit(ServertoClientEvents.FriendOffline, { uid });
      });
      usersStore.userDisconnected(uid);
    }
    console.log("User Disconnected:", socket.id, "UID:", uid);
  };

  socket.on(ClientToServerEvents.SendChatRequest, sendRequestUser);
  socket.on(ClientToServerEvents.RequestAnswer, requestAnswer);
  socket.on("disconnect", handleDisconnect);
}
