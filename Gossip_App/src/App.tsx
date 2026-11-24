import React, { useEffect } from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import Navbar from "./Components/Navbar/navbar";
import Home from "./Components/Home/Home";
import Chat from "./Components/Chat/Chat";
import NotFound from "./Components/NotFound/NotFound";
import { useDispatch, useSelector } from "react-redux";
import Account from "./Components/Account/Account";
import { addRequest, setOnline } from "./store/slices/UserSlice";
import {
  addChat,
  addFriend,
  setFriendOffline,
  setFriendOnline,
  setReceivedMessages,
  setSeenMessages,
} from "./store/slices/ChatSlice";
import About from "./Components/About/About";
import ChatWindow from "./Components/Chat/ChatWindow/ChatWindow";
import Settings from "./Components/Settings/Settings";
import Profile from "./Components/Settings/Profile/Profile";
import Themes from "./Components/Settings/Themes/Themes";
import ImageEditor from "./Components/Chat/ImageEditor/ImageEditor";
import { setThemeColor, setThemeMode } from "./store/slices/ThemeSlice";
import Cookies from "js-cookie";
import { connectSocket, socket } from "./socket/main";
import ChatBot from "./Components/ChatBot/ChatBot";
import { cancelVideoCall, initializeVideoCall } from "./store/slices/CallSlice";
import { store, RootState, AppDispatch } from "./store/store";
import { videoCallRingingReceiverSide } from "./socket/call";
import ImageViewer from "./Components/Chat/ChatWindow/ImageViewer/ImageViewer";
import AISettings from "./Components/Settings/AISettings/AISettings";
import { ServertoClientEvents } from "@gossip/shared";
import { NotificationContainer } from "./Components/Notifications";
import { notify } from "./utils/notify";

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLogin, authtoken } = useSelector((state: RootState) => state.user);
  const themeColor = useSelector((state: RootState) => state.theme.themeColor);
  const themeMode = useSelector((state: RootState) => state.theme.themeMode);
  const colors = useSelector((state: RootState) => state.theme.colors);

  // Setup Socket listeners with Handshake lifecycle
  useEffect(() => {
    const handleConnect = () => {
      dispatch(setOnline(true));
    };

    const handleDisconnect = () => {
      dispatch(setOnline(false));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
      dispatch(setOnline(false));
    });

    socket.on(
      ServertoClientEvents.RequestFromUser,
      ({ uid, profile, username }: any) => {
        notify.info("Friend Request", `${username} sent you a friend request`);
        dispatch(addRequest({ uid, profile, username }));
      },
    );

    socket.on(ServertoClientEvents.SuccessMessage, ({ msg, user }: any) => {
      if (msg) notify.success("Success", msg);
      if (user) dispatch(addFriend(user));
    });

    socket.on(ServertoClientEvents.ErrorMessage, (message: string) => {
      notify.error("Error", message);
    });

    socket.on(ServertoClientEvents.FriendOnline, ({ uid }: { uid: string }) => {
      dispatch(setFriendOnline(uid));
      dispatch(setReceivedMessages(uid));
    });

    socket.on(
      ServertoClientEvents.FriendOffline,
      ({ uid }: { uid: string }) => {
        dispatch(setFriendOffline(uid));
      },
    );

    socket.on(ServertoClientEvents.ReceiveMessage, (newChat: any) => {
      dispatch(addChat(newChat));
    });

    socket.on(ServertoClientEvents.SeenMessages, ({ uid }: { uid: string }) => {
      dispatch(setSeenMessages(uid));
    });

    socket.on(
      ServertoClientEvents.VideoCallIncoming,
      ({ fromuid }: { fromuid: string }) => {
        const currentFriends = store.getState().chat.friends;
        const caller = currentFriends.find((u) => u.uid === fromuid);
        videoCallRingingReceiverSide({ fromuid });
        dispatch(
          initializeVideoCall({
            type: "incomingvideo",
            caller: caller || { uid: fromuid, username: fromuid },
          }),
        );
      },
    );

    socket.on(ServertoClientEvents.VideoCallCanceled, () => {
      notify.info("Call Ended", "The call was ended");
      dispatch(cancelVideoCall());
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error");
      socket.off(ServertoClientEvents.RequestFromUser);
      socket.off(ServertoClientEvents.SuccessMessage);
      socket.off(ServertoClientEvents.ErrorMessage);
      socket.off(ServertoClientEvents.FriendOnline);
      socket.off(ServertoClientEvents.FriendOffline);
      socket.off(ServertoClientEvents.ReceiveMessage);
      socket.off(ServertoClientEvents.SeenMessages);
      socket.off(ServertoClientEvents.VideoCallIncoming);
      socket.off(ServertoClientEvents.VideoCallCanceled);
    };
  }, [dispatch]);

  // Connect socket on login/token availability
  useEffect(() => {
    if (isLogin && authtoken) {
      connectSocket(authtoken);
    }
  }, [isLogin, authtoken]);

  // Sync theme css variables
  useEffect(() => {
    document.documentElement.style.setProperty("--theme-mode", themeMode);
    document.documentElement.style.setProperty("--theme-color", themeColor);
    document.documentElement.style.setProperty(
      "--opposite-theme-mode",
      themeMode === "white" ? "black" : "white",
    );
    if (colors?.rgbAccent) {
      document.documentElement.style.setProperty(
        "--rgb-accent",
        colors.rgbAccent,
      );
    }
    if (themeMode === "white") {
      document.documentElement.classList.remove("dark");
      if (colors?.rgbBackground) {
        document.documentElement.style.setProperty(
          "--rgb-background",
          colors.rgbBackground,
        );
      }
      if (colors?.rgbText) {
        document.documentElement.style.setProperty(
          "--rgb-color",
          colors.rgbText,
        );
      }
    } else {
      document.documentElement.classList.add("dark");
      if (colors?.rgbText) {
        document.documentElement.style.setProperty(
          "--rgb-background",
          colors.rgbText,
        );
      }
      if (colors?.rgbBackground) {
        document.documentElement.style.setProperty(
          "--rgb-color",
          colors.rgbBackground,
        );
      }
    }
  }, [themeColor, themeMode, colors]);

  useEffect(() => {
    const savedThemeColor = Cookies.get("themeColor");
    const savedThemeMode = Cookies.get("themeMode");
    if (savedThemeColor) dispatch(setThemeColor(savedThemeColor));
    if (savedThemeMode) dispatch(setThemeMode(savedThemeMode));
  }, [dispatch]);

  return (
    <>
      <NotificationContainer />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navbar title="Gossip AI" />}>
            <Route index element={<Home />} />
            <Route path="/chatbot" element={<ChatBot />} />
            <Route path="chat" element={<Chat />}>
              <Route
                index
                element={
                  <div className="hidden md:flex h-full items-center justify-center opacity-60 text-sm">
                    Select a conversation to start chatting
                  </div>
                }
              />
              <Route path=":uid" element={<ChatWindow />}>
                <Route path="sendimage" element={<ImageEditor />} />
                <Route path="viewimage" element={<ImageViewer />} />
              </Route>
              <Route path="chatbot" element={<ChatBot />} />
            </Route>
            <Route path="/login/:type" element={<Account />} />
            <Route path="/login" element={<Account />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />}>
              <Route path="profile" element={<Profile />} />
              <Route path="themes" element={<Themes />} />
              <Route path="ai-settings" element={<AISettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
