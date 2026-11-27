import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";
import {
  ClientToServerEvents,
  ServertoClientEvents,
  socketSuccess,
} from "@gossip/shared";
import { onSocketEvent } from "../utils/on-socket-event.js";
import { userStore } from "../store/sessionStore.js";
import { NotFriendsError, ReceiverOfflineError } from "../errors/index.js";
import { isFriend } from "../repository/friend.repository.js";

export default function registerCallHandlers(
  _io: TypedServer,
  socket: TypedSocket,
): void {
  const ensureFriends = async (peerUid: string): Promise<void> => {
    if (!(await isFriend(socket.data.uid, peerUid))) {
      throw new NotFriendsError();
    }
  };

  const videoCallOutgoing: ClientHandler<
    ClientToServerEvents.VideoCallOutgoing
  > = async ({ touid, offer }, ack) => {
    await ensureFriends(touid);
    const receiver = userStore.getUser(touid);
    if (!receiver) {
      throw new ReceiverOfflineError();
    }
    socket.data.log.info({ touid }, "Sending Video Call Outgoing");
    socket.to(touid).emit(ServertoClientEvents.VideoCallIncoming, {
      fromuid: socket.data.uid,
      offer,
    });
    ack(socketSuccess());
  };

  const videoCallAnswer: ClientHandler<
    ClientToServerEvents.VideoCallAnswer
  > = async ({ touid, answer }) => {
    await ensureFriends(touid);
    socket.data.log.info({ touid }, "Video Call Ans");
    socket.to(touid).emit(ServertoClientEvents.VideoCallAnswer, { answer });
  };

  const videoCallCanceled: ClientHandler<
    ClientToServerEvents.VideoCallCanceled
  > = async ({ touid }) => {
    await ensureFriends(touid);
    socket.data.log.info({ touid }, "Video Call Canceled");
    socket.to(touid).emit(ServertoClientEvents.VideoCallCanceled);
  };

  const videoCallRinging: ClientHandler<
    ClientToServerEvents.VideoCallRinging
  > = async ({ fromuid }: { fromuid: string }) => {
    await ensureFriends(fromuid);
    // here fromuid refer to the user who is calling, and we are notifying the caller that the callee is ringing
    socket.data.log.info({ fromuid }, "Video Call Ringing");
    socket.to(fromuid).emit(ServertoClientEvents.VideoCallRinging);
  };

  onSocketEvent(
    socket,
    ClientToServerEvents.VideoCallOutgoing,
    videoCallOutgoing,
  );
  onSocketEvent(socket, ClientToServerEvents.VideoCallAnswer, videoCallAnswer);
  onSocketEvent(
    socket,
    ClientToServerEvents.VideoCallCanceled,
    videoCallCanceled,
  );
  onSocketEvent(
    socket,
    ClientToServerEvents.VideoCallRinging,
    videoCallRinging,
  );
}
