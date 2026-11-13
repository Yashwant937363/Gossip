import React from "react";
import { AnimatePresence } from "motion/react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import NotificationCard from "./NotificationCard";

export default function NotificationContainer() {
  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-[min(380px,calc(100vw-2rem))] w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationCard notification={notification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
