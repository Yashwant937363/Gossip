import {
  ClientToServerEvents,
  ServertoClientEvents,
  type SocketResponse,
} from "@gossip/shared";
import { cancelVideoCall, initializeVideoCall } from "../store/slices/CallSlice";
import { type AppDispatch, store } from "../store/store";
import { notify } from "../utils/notify";
import { type AppSocket, socket } from "./client";

export function sendOutgoingVideoCall({
  touid,
  offer,
  fromuid,
}: {
  touid: string;
  offer?: any;
  fromuid?: string;
}): Promise<SocketResponse> {
  return new Promise((resolve) => {
    socket.emit(
      ClientToServerEvents.VideoCallOutgoing,
      {
        touid,
        offer,
        fromuid: fromuid || "",
      },
      (response: SocketResponse) => {
        resolve(response);
      },
    );
  });
}

export function socketCancelVideoCall({ touid }: { touid?: string }): void {
  if (touid) {
    socket.emit(ClientToServerEvents.VideoCallCanceled, { touid });
  }
}

export function videoCallRingingReceiverSide({
  fromuid,
}: {
  fromuid: string;
}): void {
  socket.emit(ClientToServerEvents.VideoCallRinging, { fromuid });
}

export function sendVideoCallAnswer({
  touid,
  answer,
}: {
  touid: string;
  answer: any;
}): void {
  socket.emit(ClientToServerEvents.VideoCallAnswer, { touid, answer });
}

export function registerCallListeners(
  appSocket: AppSocket,
  dispatch: AppDispatch,
): () => void {
  const onVideoCallIncoming = ({ fromuid }: { fromuid: string }) => {
    const currentFriends = store.getState().chat.friends;
    const caller = currentFriends.find((u) => u.uid === fromuid);
    videoCallRingingReceiverSide({ fromuid });
    dispatch(
      initializeVideoCall({
        type: "incomingvideo",
        caller: caller || { uid: fromuid, username: fromuid },
      }),
    );
  };

  const onVideoCallCanceled = () => {
    notify.info("Call Ended", "The call was ended");
    dispatch(cancelVideoCall());
  };

  appSocket.on(ServertoClientEvents.VideoCallIncoming, onVideoCallIncoming);
  appSocket.on(ServertoClientEvents.VideoCallCanceled, onVideoCallCanceled);

  return () => {
    appSocket.off(ServertoClientEvents.VideoCallIncoming, onVideoCallIncoming);
    appSocket.off(ServertoClientEvents.VideoCallCanceled, onVideoCallCanceled);
  };
}
