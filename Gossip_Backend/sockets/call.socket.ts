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
import { ReceiverOfflineError } from "../errors/index.js";

export default function registerCallHandlers(
  _io: TypedServer,
  socket: TypedSocket,
): void {
  const videoCallOutgoing: ClientHandler<
    ClientToServerEvents.VideoCallOutgoing
  > = ({ touid, offer }, ack) => {
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
  > = ({ touid, answer }) => {
    socket.data.log.info({ touid }, "Video Call Ans");
    socket.to(touid).emit(ServertoClientEvents.VideoCallAnswer, { answer });
  };

  const videoCallCanceled: ClientHandler<
    ClientToServerEvents.VideoCallCanceled
  > = ({ touid }) => {
    socket.data.log.info({ touid }, "Video Call Canceled");
    socket.to(touid).emit(ServertoClientEvents.VideoCallCanceled);
  };

  const videoCallRinging: ClientHandler<
    ClientToServerEvents.VideoCallRinging
  > = ({ fromuid }: { fromuid: string }) => {
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
