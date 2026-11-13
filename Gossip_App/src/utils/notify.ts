import { store } from "../store/store";
import {
  addNotification,
  removeNotification,
  NotificationType,
} from "../store/slices/NotificationSlice";

export const notify = (
  type: NotificationType,
  title: string,
  message: string,
  duration: number = 4000
): string => {
  const id = crypto.randomUUID();

  store.dispatch(
    addNotification({
      id,
      type,
      title,
      message,
    })
  );

  if (duration > 0) {
    setTimeout(() => {
      store.dispatch(removeNotification(id));
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
  store.dispatch(removeNotification(id));
};
