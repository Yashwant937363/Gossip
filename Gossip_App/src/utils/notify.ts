import {
  addNotification,
  removeNotification,
  NotificationType,
} from "../store/slices/NotificationSlice";
import { AppDispatch } from "../store/store";

let storeDispatch: AppDispatch | null = null;

export const injectNotificationDispatch = (dispatch: AppDispatch) => {
  storeDispatch = dispatch;
};

export const notify = (
  type: NotificationType,
  title: string,
  message: string,
  duration: number = 4000,
): string => {
  if (!storeDispatch) return;
  const id = crypto.randomUUID();

  storeDispatch(
    addNotification({
      id,
      type,
      title,
      message,
    }),
  );

  if (duration > 0) {
    setTimeout(() => {
      storeDispatch(removeNotification(id));
    }, duration);
  }

  return id;
};

// Convenience helpers
notify.success = (title: string, message: string, duration: number = 4000) =>
  notify("success", title, message, duration);

notify.error = (title: string, message: string, duration: number = 4000) =>
  notify("error", title, message, duration);

notify.warning = (title: string, message: string, duration: number = 4000) =>
  notify("warning", title, message, duration);

notify.info = (title: string, message: string, duration: number = 4000) =>
  notify("info", title, message, duration);

notify.dismiss = (id: string) => {
  if (storeDispatch) {
    storeDispatch(removeNotification(id));
  }
};
