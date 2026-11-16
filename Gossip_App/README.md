# Gossip App (Frontend)

The frontend client for **Gossip**, a real-time messaging, video conferencing, and AI communication platform built with **React**, **TypeScript**, **Vite**, **Redux Toolkit**, and **Tailwind CSS**.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [State Management (Redux Toolkit)](#state-management-redux-toolkit)
- [WebSocket Architecture](#websocket-architecture)
- [API Client & Integration](#api-client--integration)
- [Video Calling & Virtual Backgrounds](#video-calling--virtual-backgrounds)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Production Deployment (Render)](#production-deployment-render)

---

## ✨ Features

### 💬 Real-Time Messaging
- Instant one-on-one text and image messaging via Socket.io.
- Read receipts with live delivery/seen status tracking.
- Syncfusion-powered in-app image editor (crop, annotate, rotate, filters) before sending attachments.
- Built-in media viewer with zoom, pan, and AI image analysis.

### 🤖 AI Assistance (Groq Cloud)
- **AI ChatBot:** Interactive conversation bot with selectable response tones (`normal`, `friendly`, `formal`, `sarcastic`, `compassionate`, `humorous`).
- **Live Message Translation:** Translates incoming/outgoing messages into preferred languages (English, Hindi, Marathi, Spanish, Punjabi).
- **Conversation Summaries:** Automatically generates bullet point, paragraph, or structured conversation recaps.
- **Image Intelligence:** Extracts descriptions, mood, and details from shared photos.

### 📹 Video Calling (Agora RTC & WebRTC)
- High-definition video conferencing with Agora RTC SDK.
- **Virtual Backgrounds:** Custom background blur, solid colors, and custom images.
- Camera and microphone controls with real-time ringing and call-state feedback.

### 🎨 Theming & UX
- Custom light and dark modes with dynamic CSS variables.
- Dynamic accent color palette.
- Responsive mobile and desktop layouts with Tailwind CSS.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18 + TypeScript** | UI framework with strict type-safety |
| **Vite 5** | Next-generation bundler and local dev server |
| **`@gossip/shared`** | Shared workspace types, contracts, and Zod schemas |
| **Redux Toolkit** | Centralized global state management |
| **Socket.io Client** | Real-time bidirectional WebSocket connection |
| **Agora RTC SDK** | Video and audio streaming infrastructure |
| **Agora Virtual Background**| AI-powered camera background replacement |
| **Syncfusion Image Editor**| In-app canvas image manipulation |
| **Tailwind CSS** | Utility-first responsive styling |
| **Axios** | Authenticated REST client |
| **React Router 6** | Client-side routing and page navigation |

---

## 📁 Project Structure

```
Gossip_App/
├── index.html
├── vite.config.ts             # Vite configuration with React plugin
├── tsconfig.json              # TypeScript config with @gossip/shared paths
├── tailwind.config.js         # Tailwind theme & color setup
├── package.json
├── src/
│   ├── main.tsx               # App root bootstrap (Agora Provider, Redux Provider)
│   ├── App.tsx                # Route definitions & global socket handshake listeners
│   ├── index.css              # Global styles and theme variable definitions
│   ├── api/
│   │   ├── client.ts          # Typed Axios instance using @gossip/shared DTOs
│   │   └── api-error.ts       # Centralized API error extractor
│   ├── socket/
│   │   ├── main.ts            # Socket.io connection instance & handshake auth
│   │   ├── chat.ts            # Messaging event handlers
│   │   ├── call.ts            # Video call signaling handlers
│   │   ├── user.ts            # Presence and friend request listeners
│   │   └── settings.ts        # Live settings socket emitters
│   ├── store/
│   │   ├── store.ts           # Redux store configuration
│   │   └── slices/
│   │       ├── UserSlice.ts   # User profile, auth token, and presence
│   │       ├── ChatSlice.ts   # Friends list, active chats, and messages
│   │       ├── CallSlice.ts   # Video call states, ringing, active stream
│   │       ├── AIChatBotSlice.ts # ChatBot messages and selected tone
│   │       └── ThemeSlice.ts  # Theme mode and accent colors
│   ├── Components/
│   │   ├── Account/           # Login, Signup, and OTP modals
│   │   ├── Chat/              # Chat window, message bubbles, sidebar, image editor
│   │   ├── ChatBot/           # Floating AI assistant dialog
│   │   ├── Settings/          # Profile, AI settings, and theme customizer
│   │   ├── Navbar/            # Navigation header
│   │   └── Notifications/     # Toast notifications
│   └── utils/
│       └── notify.ts          # Toast dispatch utility
```

---

## 🔄 State Management (Redux Toolkit)

The application uses typed slices driven by contracts from `@gossip/shared`:

* **`UserSlice`**: Holds `UserState extends IPublicUser` (`uid`, `username`, `email`, `profile`, `settings`, `authtoken`, `online`).
* **`ChatSlice`**: Manages `friends: Friend[]` and `chats: IChat[]` using standardized `senderUid` and `receiverUid`.
* **`CallSlice`**: Tracks Agora channel tokens, remote peer UIDs, incoming call modals, and audio/video track toggles.
* **`AIChatBotSlice`**: Tracks conversation history with the AI persona and handles tone selections.
* **`ThemeSlice`**: Manages light/dark mode and active primary accent color.

---

## ⚡ WebSocket Architecture

The socket connection is initialized in [src/socket/main.ts](file:///home/yashwant/MyProject/Gossip/Gossip_App/src/socket/main.ts):

```ts
import { io, Socket } from "socket.io-client";
import { 
  ClientToServerEventsTypes, 
  ServerToClientEventsTypes 
} from "@gossip/shared";

export const socket: Socket<ServerToClientEventsTypes, ClientToServerEventsTypes> = io(
  SERVER_URL,
  {
    auth: { token: `Bearer ${Cookies.get("authtoken")}` },
    autoConnect: false,
    reconnection: true,
  }
);
```

Global event handlers are mounted in `App.tsx` and dynamically dispatch actions to Redux slices on incoming messages, call invitations, and friend presence updates.

---

## 🔌 API Client (`src/api/client.ts`)

All REST calls are typed with request/response schemas imported from `@gossip/shared`:

* `apiSignUp(formData)`: Multipart registration with profile photo.
* `apiSignIn(data: SigninReq)`: Authenticates user credentials.
* `apiGetUser()`: Restores session on page reload using stored JWT.
* `apiGetFriends()`: Fetches contact list and chat history.
* `apiUploadImage(file)`: Uploads image attachments to Cloudinary.
* `apiChatbot(data: ChatbotInput)`: Communicates with the AI chatbot.
* `apiTranslate(data: TranslateMessagesInput)`: Translates messages on demand.
* `apiSummarize(data: SummarizationInput)`: Summarizes conversation history.

---

## ⚙️ Environment Variables

Create `.env` inside `Gossip_App/`:

```env
# URL of your Gossip_Backend service:
VITE_API_SERVER_URL=http://localhost:5000

# Agora RTC App ID (for live video calls):
VITE_AGORA_APP_ID=your_agora_app_id
```

---

## 🚀 Available Scripts

Run directly inside `Gossip_App/` or via the root workspace:

```bash
# Start local Vite development server:
npm run dev

# Run TypeScript checks and build production assets:
npm run build

# Preview production build locally:
npm run preview

# Run ESLint:
npm run lint
```

---

## 🌐 Production Deployment (Render)

Deploy as a **Static Site** on Render:

* **Name:** `gossip-frontend`
* **Root Directory:** *(leave blank / default)*
* **Build Command:**
  ```bash
  npm run install:frontend && npm run build:frontend
  ```
* **Publish Directory:**
  ```
  Gossip_App/dist
  ```
* **Environment Variables:**
  * `VITE_API_SERVER_URL`: `https://your-backend-service.onrender.com`
  * `VITE_AGORA_APP_ID`: Your production Agora App ID
* **Redirects / Rewrites:**
  * Type: `Rewrite`
  * Source: `/*`
  * Destination: `/index.html` (Required for React Router single-page navigation)
