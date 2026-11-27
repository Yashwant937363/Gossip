import {
  ClientToServerEvents,
  type Friend,
  ServertoClientEvents,
  type SocketResponse,
} from "@gossip/shared";
import {
  addFriend,
  setFriendOffline,
  setFriendOnline,
  setReceivedMessages,
} from "../store/slices/ChatSlice";
import { addRequest } from "../store/slices/UserSlice";
import type { AppDispatch } from "../store/store";
import { notify } from "../utils/notify";
import { type AppSocket, socket } from "./client";

export function sendChatRequest(fromuid: string, touid: string): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.emit(
      ClientToServerEvents.SendChatRequest,
      { fromuid, touid },
      (response) => {
        if (response.success === false) {
          reject(new Error(response.error));
        } else {
          resolve(response.message);
        }
      },
    );
  });
}

export function requestAnswer({
  fromuid,
  touid,
  answer,
}: {
  fromuid: string;
  touid: string;
  answer: boolean;
}): Promise<SocketResponse> {
  return new Promise((resolve) => {
    socket.emit(
      ClientToServerEvents.RequestAnswer,
      { fromuid, touid, answer },
      (response) => resolve(response),
    );
  });
}

export function registerUserListeners(
  appSocket: AppSocket,
  dispatch: AppDispatch,
): () => void {
  const onRequestFromUser = ({
    uid,
    profile,
    username,
  }: {
    uid: string;
    profile: string;
    username: string;
  }) => {
    notify.info("Friend Request", `${username} sent you a friend request`);
    dispatch(addRequest({ uid, profile, username }));
  };

  const onSuccessMessage = ({
    msg,
    user,
  }: {
    msg?: string;
    user?: Friend;
  }) => {
    if (msg) notify.success("Success", msg);
    if (user) dispatch(addFriend(user));
  };

  const onErrorMessage = (message: string) => {
    notify.error("Error", message);
  };

  const onFriendOnline = ({ uid }: { uid: string }) => {
    dispatch(setFriendOnline(uid));
    dispatch(setReceivedMessages(uid));
  };

  const onFriendOffline = ({ uid }: { uid: string }) => {
    dispatch(setFriendOffline(uid));
  };

  appSocket.on(ServertoClientEvents.RequestFromUser, onRequestFromUser);
  appSocket.on(ServertoClientEvents.SuccessMessage, onSuccessMessage);
  appSocket.on(ServertoClientEvents.ErrorMessage, onErrorMessage);
  appSocket.on(ServertoClientEvents.FriendOnline, onFriendOnline);
  appSocket.on(ServertoClientEvents.FriendOffline, onFriendOffline);

  return () => {
    appSocket.off(ServertoClientEvents.RequestFromUser, onRequestFromUser);
    appSocket.off(ServertoClientEvents.SuccessMessage, onSuccessMessage);
    appSocket.off(ServertoClientEvents.ErrorMessage, onErrorMessage);
    appSocket.off(ServertoClientEvents.FriendOnline, onFriendOnline);
    appSocket.off(ServertoClientEvents.FriendOffline, onFriendOffline);
  };
}
