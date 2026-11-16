import { ClientToServerEvents } from "@gossip/shared";
import { socket } from "./main";

export function sendOutgoingVideoCall({
  touid,
  offer,
  fromuid,
}: {
  touid: string;
  offer?: any;
  fromuid?: string;
}) {
  socket.emit(ClientToServerEvents.VideoCallOutgoing, {
    touid,
    offer,
    fromuid,
  });
}

export function socketCancelVideoCall({ touid }: { touid?: string }) {
  if (touid) {
    socket.emit(ClientToServerEvents.VideoCallCanceled, { touid });
  }
}

export function videoCallRingingReceiverSide({ fromuid }: { fromuid: string }) {
  socket.emit(ClientToServerEvents.VideoCallRinging, { fromuid });
}

export function sendVideoCallAnswer({
  touid,
  answer,
}: {
  touid: string;
  answer: any;
}) {
  socket.emit(ClientToServerEvents.VideoCallAnswer, { touid, answer });
}
