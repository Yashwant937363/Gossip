import type {
  ClientHandler,
  TypedServer,
  TypedSocket,
} from "../types/socket.types.js";
import { ClientToServerEvents, ServertoClientEvents } from "@gossip/shared";

export default function registerCallHandlers(
  _io: TypedServer,
  socket: TypedSocket,
): void {
  const videoCallOutgoing: ClientHandler<
    ClientToServerEvents.VideoCallOutgoing
  > = ({ touid, offer }) => {
    socket.to(touid).emit(ServertoClientEvents.VideoCallIncoming, {
      fromuid: socket.data.uid,
      offer,
    });
  };

  const videoCallAnswer: ClientHandler<
    ClientToServerEvents.VideoCallAnswer
  > = ({ touid, answer }) => {
    socket.to(touid).emit(ServertoClientEvents.VideoCallAnswer, { answer });
  };

  const videoCallCanceled: ClientHandler<
    ClientToServerEvents.VideoCallCanceled
  > = ({ touid }) => {
    socket.to(touid).emit(ServertoClientEvents.VideoCallCanceled);
  };

  const videoCallRinging: ClientHandler<
    ClientToServerEvents.VideoCallRinging
  > = ({ fromuid }: { fromuid: string }) => {
    // here fromuid refer to the user who is calling, and we are notifying the caller that the callee is ringing
    socket.to(fromuid).emit(ServertoClientEvents.VideoCallRinging);
  };

  socket.on(ClientToServerEvents.VideoCallOutgoing, videoCallOutgoing);
  socket.on(ClientToServerEvents.VideoCallAnswer, videoCallAnswer);
  socket.on(ClientToServerEvents.VideoCallCanceled, videoCallCanceled);
  socket.on(ClientToServerEvents.VideoCallRinging, videoCallRinging);
}
