import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

export interface NotificationState {
  notifications: NotificationItem[];
}

const initialState: NotificationState = {
  notifications: [],
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationSlice.actions;

export default notificationSlice.reducer;
