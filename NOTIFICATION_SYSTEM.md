# Notification System Architecture & Implementation Guide

This document explains the architecture, design patterns, and complete implementation of the notification/toast system used in this project. It is structured so that you can directly copy, adapt, and implement this exact system in any other React / TypeScript application.

---

## 1. Overview & Key Highlights

The notification system provides lightweight, stackable, animated toast notifications with the following characteristics:

- **Imperative Standalone Dispatcher (`notify(...)`)**: Can be called from **anywhere** in your application—not just inside React components or hooks. You can trigger toasts directly from WebSocket event listeners, Axios/fetch interceptors, background timers, or helper functions.
- **Centralized State Management**: Powered by **Redux Toolkit**, maintaining a clean array of active notifications in memory.
- **Fluid Layout & Micro-animations**: Built with `motion` (`framer-motion`), providing enter animations (slide-in from right), exit animations (slide-out), and smooth reordering (`layout` animation) when items above are dismissed.
- **Auto-dismiss + Manual Dismiss**: Automatically dismisses after 4 seconds using `crypto.randomUUID()` and `setTimeout`, while also supporting immediate dismissal via a close button.
- **Non-blocking Container**: The parent container uses `pointer-events-none` so it does not block clicks on the underlying UI, while cards use `pointer-events-auto` so users can still click the dismiss button.
- **Dark Glassmorphism Theme**: Styled using Tailwind CSS with backdrop blur, subtle borders, and color-coded icons (Lucide Icons) for 4 distinct notification types: `success`, `error`, `warning`, and `info`.

---

## 2. System Architecture & Flow

```mermaid
flowchart TD
    subgraph Triggers ["Trigger Sources"]
        UI["React Component (Buttons, Forms, Copy Link)"]
        WS["WebSocket Event Listener (e.g., song-added, room-joined)"]
        API["Axios / Fetch Interceptors (HTTP errors, 401s, etc.)"]
    end

    subgraph Core ["Notification Core"]
        Helper["notify(type, title, message)<br/>(Generates UUID & dispatches)"]
        Store["Redux Store: notificationSlice<br/>[ { id, type, title, message }, ... ]"]
        Timer["setTimeout (4000ms)<br/>Auto-dispatches removeNotification(id)"]
    end

    subgraph UI_Layer ["Rendering Layer"]
        Container["NotificationContainer<br/>(fixed top-5 right-5 z-9999)"]
        Animate["AnimatePresence"]
        Cards["NotificationCard (motion.div layout)<br/>Color-coded borders & Lucide Icons"]
    end

    UI --> Helper
    WS --> Helper
    API --> Helper

    Helper -->|store.dispatch(addNotification)| Store
    Helper -->|Triggers timer| Timer
    Timer -->|store.dispatch(removeNotification)| Store

    Store -->|useAppSelector| Container
    Container --> Animate
    Animate --> Cards
    Cards -->|User clicks 'X' button| Store
```

---

## 3. Required Dependencies

Install these dependencies in your target project:

```bash
# Redux Toolkit & React-Redux
npm install @reduxjs/toolkit react-redux

# Animation library (motion / framer-motion)
npm install motion

# Icons
npm install lucide-react

# Tailwind CSS (v3 or v4)
# Ensure Tailwind CSS is configured in your project
```

> **Note on motion import**: If you use standard Framer Motion, import from `"framer-motion"`. In this project, `motion/react` is imported from the modern `motion` package (`npm i motion`). Both work identically for `<motion.div>` and `<AnimatePresence>`.

---

## 4. File-by-File Implementation

### File Structure
```
src/
├── store/
│   ├── store.ts                      # Redux store configuration
│   ├── hooks.ts                      # Typed useDispatch / useSelector hooks
│   └── slices/
│       └── NotificationSlice.ts      # State slice & reducers
├── utils/
│   └── notify.ts                     # Standalone imperative helper
└── components/
    └── notifications/
        ├── NotificationCard.tsx      # Individual card component with icons & animations
        └── NotificationContainer.tsx # Fixed container wrapped with AnimatePresence
```

---

### Step 1: Redux Slice (`src/store/slices/NotificationSlice.ts`)

Defines the notification data structure and reducers to add and remove notifications by unique `id`.

```typescript
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
  },
});

export const { addNotification, removeNotification } =
  notificationSlice.actions;

export default notificationSlice.reducer;
```

---

### Step 2: Redux Store & Typed Hooks

#### `src/store/store.ts`
Register `notificationSlice` into the root store:

```typescript
import { configureStore } from "@reduxjs/toolkit";
import notificationSlice from "./slices/NotificationSlice";
// import other slices here...

export const store = configureStore({
  reducer: {
    notifications: notificationSlice,
    // other reducers...
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
```

#### `src/store/hooks.ts`
```typescript
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

---

### Step 3: Standalone Dispatcher Utility (`src/utils/notify.ts`)

This utility allows calling `notify(...)` anywhere without needing React context or `useDispatch`.

```typescript
import { store } from "../store/store";
import {
  addNotification,
  removeNotification,
} from "../store/slices/NotificationSlice";

export const notify = (
  type: "success" | "error" | "warning" | "info",
  title: string,
  message: string
) => {
  const id = crypto.randomUUID();

  // 1. Add notification to Redux store
  store.dispatch(
    addNotification({
      id,
      type,
      title,
      message,
    })
  );

  // 2. Schedule automatic removal after 4 seconds
  setTimeout(() => {
    store.dispatch(removeNotification(id));
  }, 4000);
};
```

---

### Step 4: Notification Card Component (`src/components/notifications/NotificationCard.tsx`)

Renders an individual notification with:
- Type-specific icon (`CheckCircle`, `XCircle`, `AlertTriangle`, `Info`)
- Accent border and icon colors
- Slide-in and slide-out animation
- Close `X` button for manual dismissal

```tsx
import { motion } from "motion/react"; // or from "framer-motion"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import {
  type Notification,
  removeNotification,
} from "../../store/slices/NotificationSlice";
import { useAppDispatch } from "../../store/hooks";

type Props = {
  notification: Notification;
};

export default function NotificationCard({ notification }: Props) {
  const dispatch = useAppDispatch();

  // Type configuration maps type -> icon and Tailwind color schemes
  const styles = {
    success: {
      icon: CheckCircle,
      border: "border-green-500/30",
      iconColor: "text-green-400",
    },
    error: {
      icon: XCircle,
      border: "border-red-500/30",
      iconColor: "text-red-400",
    },
    warning: {
      icon: AlertTriangle,
      border: "border-yellow-500/30",
      iconColor: "text-yellow-400",
    },
    info: {
      icon: Info,
      border: "border-blue-500/30",
      iconColor: "text-blue-400",
    },
  };

  const config = styles[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        x: 300,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      exit={{
        opacity: 0,
        x: 300,
      }}
      transition={{
        duration: 0.25,
      }}
      className={`
        w-85
        rounded-2xl
        border
        bg-slate-900/95
        backdrop-blur-xl
        p-4
        shadow-xl
        ${config.border}
      `}
    >
      <div className="flex gap-3">
        <Icon size={22} className={`${config.iconColor} shrink-0 mt-0.5`} />

        <div className="flex-1">
          <h4 className="font-semibold text-white">{notification.title}</h4>
          <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
        </div>

        <button
          onClick={() => dispatch(removeNotification(notification.id))}
          className="
            text-slate-500
            hover:text-white
            cursor-pointer
          "
          aria-label="Close notification"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
```

---

### Step 5: Notification Container (`src/components/notifications/NotificationContainer.tsx`)

Renders a fixed overlay in the top-right corner. It renders all active notifications inside an `AnimatePresence` wrapper.

```tsx
import { AnimatePresence } from "motion/react"; // or from "framer-motion"
import { useAppSelector } from "../../store/hooks";
import NotificationCard from "./NotificationCard";

export default function NotificationContainer() {
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );

  return (
    <div
      className="
        fixed
        top-5
        right-5
        z-9999

        flex
        flex-col
        gap-3

        pointer-events-none
      "
    >
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationCard notification={notification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

### Step 6: Mount Container in Layout or App Root

Place `<NotificationContainer />` once in your root layout or global navigation component (e.g., `App.tsx` or `Navbar.tsx`):

```tsx
import { Provider } from "react-redux";
import { store } from "./store/store";
import NotificationContainer from "./components/notifications/NotificationContainer";

export default function App() {
  return (
    <Provider store={store}>
      <Navbar />
      <NotificationContainer />
      <main>
        {/* Your routes and pages */}
      </main>
    </Provider>
  );
}
```

---

## 5. How to Trigger Notifications

### A. Inside React Components (User Actions)
```tsx
import { notify } from "../utils/notify";

export function CopyRoomButton({ roomId }: { roomId: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    notify("info", "Copied", "Room link copied to clipboard");
  };

  const handleValidate = () => {
    if (!roomId) {
      notify("warning", "Missing Room Id", "Please enter a valid room ID.");
      return;
    }
  };

  return <button onClick={handleCopy}>Share Link</button>;
}
```

### B. In WebSocket Event Listeners
Because `notify` does not rely on React hooks, it can be called straight from socket event callbacks:

```typescript
import { notify } from "../utils/notify";

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.event) {
    case "room-joined":
      notify(
        "success",
        "Room Joined Successfully",
        `Room Name: ${data.message.room.name}`
      );
      break;

    case "song-added":
      notify("success", "Song Added", `Name: ${data.message.name}`);
      break;

    case "error":
      notify("error", data.message.title, data.message.message);
      break;
  }
};
```

### C. In Axios / HTTP Client Interceptors
```typescript
import axios from "axios";
import { notify } from "./utils/notify";

const api = axios.create({ baseURL: "/api" });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const title = error.response?.data?.title || "Request Failed";
    const message = error.response?.data?.message || error.message;
    notify("error", title, message);
    return Promise.reject(error);
  }
);
```

---

## 6. Backend Integration Protocol (Example: Go WebSockets)

If your backend communicates via WebSockets, you can standardize error and notification payloads:

### Backend Structure (Go)
```go
type ErrorPayload struct {
    Title   string         `json:"title"`
    Message string         `json:"message"`
    Event   string         `json:"event"`
    Data    map[string]any `json:"data,omitempty"`
}

func SendError(client *Client, title string, message string, event string, id string) {
    SendEvent(client, "error", map[string]any{
        "title":   title,
        "message": message,
        "event":   event,
        "data": map[string]any{
            "id": id,
        },
    })
}
```

When sent across the socket:
```json
{
  "event": "error",
  "message": {
    "title": "Room Not Found",
    "message": "The requested room ID does not exist or has closed.",
    "event": "join-room"
  }
}
```

The frontend can immediately pass `data.message.title` and `data.message.message` to `notify("error", ...)`!

---

## 7. Optional Enhancements for Your New Project

1. **Configurable Duration**:
   Allow passing an optional duration (e.g. `notify(type, title, message, durationMs = 4000)`).
2. **Pause on Hover**:
   Store the timeout ID on the notification item and cancel/resume the timeout when the user hovers over the card.
3. **Alternative State Management (Zustand)**:
   If your next project does not use Redux, you can replace `NotificationSlice` with a small Zustand store:
   ```typescript
   import { create } from "zustand";

   export const useNotificationStore = create<State>((set) => ({
     notifications: [],
     add: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
     remove: (id) => set((s) => ({ notifications: s.notifications.filter(x => x.id !== id) })),
   }));

   export const notify = (type, title, message) => {
     const id = crypto.randomUUID();
     useNotificationStore.getState().add({ id, type, title, message });
     setTimeout(() => useNotificationStore.getState().remove(id), 4000);
   };
   ```
4. **Sound Effects / Audio Feedback**:
   Trigger short sound effects in `notify()` for error or success alerts if desired.
