# Frontend Socket Architecture (`Gossip_App/src/socket`)

This document explains how Socket.io code is organized in `Gossip_App`, why it is structured this way, and how the connection lifecycle works.

---

## 1. Why This Structure?

Previously, socket logic was spread across multiple places:
- `App.tsx` registered all `socket.on(...)` listeners and called `connectSocket()`.
- `Chat.tsx` also called `connectSocket()` on mount.
- `socket/main.ts` only checked `if (!socket.connected)` (missing `!socket.active`), so an in-flight handshake could be triggered twice—opening **two sockets ~15ms apart** and causing the backend's single-session check to kick the tab's first socket.

Separating connection lifecycle from feature emitters fixes this and mirrors `Gossip_Backend/sockets/`.

---

## 2. Folder Structure

```text
src/socket/
├── client.ts          # Socket.io singleton + connectSocket / disconnectSocket
├── useSocket.ts       # Single React hook (mounted once in App.tsx) for lifecycle & listeners
├── chat.socket.ts     # Chat emitters (sendMessage, seenMessages) & chat listeners
├── user.socket.ts     # User/friend emitters (sendChatRequest, requestAnswer) & presence listeners
├── call.socket.ts     # Video call emitters & call listeners
└── index.ts           # Barrel file re-exporting public socket helpers
```

---

## 3. What Each File Does

| File | Responsibility |
| :--- | :--- |
| **`client.ts`** | Creates the single `io(...)` client instance. Exposes `connectSocket(token)` (guarded by `!socket.connected && !socket.active`) and `disconnectSocket()`. |
| **`useSocket.ts`** | Mounted **once** in `App.tsx`. Watches Redux `isLogin` + `authtoken` to connect/disconnect automatically, and registers/cleans up all domain listeners (`connect`, `disconnect`, chat, user, call). |
| **`chat.socket.ts`** | Contains only chat-related emitters (`sendMessage`, `seenMessages`) and `registerChatListeners(socket, dispatch)`. |
| **`user.socket.ts`** | Contains only user/friend emitters (`sendChatRequest`, `requestAnswer`) and `registerUserListeners(socket, dispatch)` (online/offline presence, friend requests). |
| **`call.socket.ts`** | Contains only video call emitters (`sendOutgoingVideoCall`, `videoCallAnswer`, etc.) and `registerCallListeners(socket, dispatch)`. |
| **`index.ts`** | Re-exports `socket`, `connectSocket`, `disconnectSocket`, and domain helpers so components import from `src/socket`. |

---

## 4. Connection Lifecycle Flow

```text
User logs in / refreshes (Redux: isLogin = true, authtoken set)
   │
   ▼
useSocket() in App.tsx calls connectSocket(authtoken)
   │
   ├── Checks: if (!socket.connected && !socket.active)
   │      └── Prevents duplicate handshakes while connecting
   │
   ├── "connect" event    ──▶ dispatch(setOnline(true))  ──▶ Green ring in Navbar
   ├── "disconnect" event ──▶ dispatch(setOnline(false)) ──▶ Red ring in Navbar
   │
User logs out (Redux: isLogin = false)
   │
   ▼
useSocket() calls disconnectSocket()
```

---

## 5. Rules to Follow

1. **Never call `connectSocket()` inside feature components** (like `Chat.tsx`). Only `useSocket.ts` in `App.tsx` manages connecting and disconnecting.
2. **Always guard `socket.connect()` with `!socket.connected && !socket.active`** so in-flight handshakes are never duplicated.
3. **Keep domain emitters/listeners in their own file** (`chat.socket.ts`, `user.socket.ts`, `call.socket.ts`) to match `Gossip_Backend/sockets/`.
