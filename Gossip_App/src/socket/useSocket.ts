import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOnline } from "../store/slices/UserSlice";
import type { AppDispatch, RootState } from "../store/store";
import { registerCallListeners } from "./call.socket";
import { registerChatListeners } from "./chat.socket";
import { connectSocket, disconnectSocket, socket } from "./client";
import { registerUserListeners } from "./user.socket";

/**
 * Manages the Socket.io connection lifecycle and domain event listeners.
 * Should be mounted once at the application root (App.tsx).
 */
export function useSocket(): void {
  const dispatch = useDispatch<AppDispatch>();
  const { isLogin, authtoken } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    const handleConnect = () => {
      dispatch(setOnline(true));
    };

    const handleDisconnect = () => {
      dispatch(setOnline(false));
    };

    const handleConnectError = (err: Error) => {
      console.warn("Socket connect error:", err.message);
      dispatch(setOnline(false));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    const cleanupUser = registerUserListeners(socket, dispatch);
    const cleanupChat = registerChatListeners(socket, dispatch);
    const cleanupCall = registerCallListeners(socket, dispatch);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      cleanupUser();
      cleanupChat();
      cleanupCall();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isLogin && authtoken) {
      connectSocket(authtoken);
    } else {
      disconnectSocket();
    }
  }, [isLogin, authtoken]);
}
