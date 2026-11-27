import React, { useEffect } from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import Navbar from "./Components/Navbar/navbar";
import Home from "./Components/Home/Home";
import Chat from "./Components/Chat/Chat";
import NotFound from "./Components/NotFound/NotFound";
import { useDispatch, useSelector } from "react-redux";
import Account from "./Components/Account/Account";
import About from "./Components/About/About";
import ChatWindow from "./Components/Chat/ChatWindow/ChatWindow";
import Settings from "./Components/Settings/Settings";
import Profile from "./Components/Settings/Profile/Profile";
import Themes from "./Components/Settings/Themes/Themes";
import ImageEditor from "./Components/Chat/ImageEditor/ImageEditor";
import { setThemeColor, setThemeMode } from "./store/slices/ThemeSlice";
import Cookies from "js-cookie";
import { useSocket } from "./socket";
import ChatBot from "./Components/ChatBot/ChatBot";
import { type AppDispatch, RootState } from "./store/store";
import ImageViewer from "./Components/Chat/ChatWindow/ImageViewer/ImageViewer";
import AISettings from "./Components/Settings/AISettings/AISettings";
import { NotificationContainer } from "./Components/Notifications";

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const themeColor = useSelector((state: RootState) => state.theme.themeColor);
  const themeMode = useSelector((state: RootState) => state.theme.themeMode);
  const colors = useSelector((state: RootState) => state.theme.colors);

  useSocket();

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
