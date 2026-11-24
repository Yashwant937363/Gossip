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
import { safeSocketHandler } from "../utils/socket-error-handler.js";
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

  socket.on(
    ClientToServerEvents.VideoCallOutgoing,
    safeSocketHandler(
      socket,
      ClientToServerEvents.VideoCallOutgoing,
      videoCallOutgoing,
    ),
  );
  socket.on(
    ClientToServerEvents.VideoCallAnswer,
    safeSocketHandler(
      socket,
      ClientToServerEvents.VideoCallAnswer,
      videoCallAnswer,
    ),
  );
  socket.on(
    ClientToServerEvents.VideoCallCanceled,
    safeSocketHandler(
      socket,
      ClientToServerEvents.VideoCallCanceled,
      videoCallCanceled,
    ),
  );
  socket.on(
    ClientToServerEvents.VideoCallRinging,
    safeSocketHandler(
      socket,
      ClientToServerEvents.VideoCallRinging,
      videoCallRinging,
    ),
  );
}
