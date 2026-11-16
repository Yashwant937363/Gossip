# Gossip Backend

The server-side application for Gossip, built with **Node.js**, **Express**, **TypeScript**, **Socket.io**, and **MongoDB**. It handles real-time messaging, WebRTC signaling, friend connection requests, JWT authentication, image processing with Cloudinary, and native AI capabilities powered by the Groq SDK.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Models](#database-models)
- [REST API Reference](#rest-api-reference)
- [WebSocket Events](#websocket-events)
- [AI Integration (Groq)](#ai-integration-groq)
- [Environment Variables](#environment-variables)
- [Development & Scripts](#development--scripts)
- [Production Build & Deployment](#production-build--deployment)

---

## 🏗️ Architecture

```
Client (Gossip_App)
     │
     ├── HTTP REST ──> Express Server ──> MongoDB (Mongoose 8)
     │
     └── WebSocket ──> Socket.io Server ──> In-Memory Session Store
                          │
                 ┌────────┴────────┐
                 │                 │
              Groq Cloud       Cloudinary
          (AI Chat, Translate,  (Profile Photos,
           Summarize, Vision)    Chat Images)
```

The server wraps Express and Socket.io on a single HTTP server port. Socket.io manages real-time messaging, presence, and WebRTC video call handshakes, while Express provides authenticated REST endpoints validated with Zod schemas imported from `@gossip/shared`.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js + TypeScript** | Strongly typed runtime environment |
| **Express 4** | HTTP REST API framework |
| **Socket.io 4** | Bidirectional real-time event engine |
| **MongoDB + Mongoose 8** | Database and schema models |
| **`@gossip/shared`** | Monorepo package for shared types & Zod schemas |
| **Groq SDK** | Ultra-fast LLM inference (Llama 3.3, Llama Vision) |
| **Cloudinary** | Cloud storage for images and attachments |
| **Sharp** | High-performance image resizing & optimization |
| **bcryptjs + JWT** | Password hashing and authentication tokens |
| **Nodemailer** | Email delivery for verification OTPs |
| **tsup** | Blazing-fast esbuild bundler for production builds |
| **tsx** | Zero-config TypeScript execution & dev watcher |
| **Vitest** | Modern unit and integration test framework |

---

## 📁 Project Structure

```
Gossip_Backend/
├── app.ts                         # Express application setup & middleware
├── index.ts                       # Server bootstrap: HTTP & Socket.io listening
├── tsup.config.ts                 # Production bundler config (bundles @gossip/shared)
├── tsconfig.json                  # TypeScript compiler settings (moduleResolution: bundler)
├── package.json
├── config/
│   ├── database.ts                # MongoDB connection handler
│   ├── cloudinary.ts              # Cloudinary SDK credentials
│   ├── env.ts                     # Environment variable validation
│   ├── groq.ts                    # Groq SDK client instance
│   ├── logger.ts                  # Pino logger configuration
│   └── mailer.ts                  # Nodemailer transport
├── controllers/
│   ├── auth.controller.ts         # Signup, signin, getUser, send-otp
│   ├── chat.controller.ts         # Chat history and image upload endpoints
│   ├── user.controller.ts         # Search users endpoint
│   └── ai.controller.ts           # Chatbot, translate, summarize, image-analyze
├── middlewares/
│   ├── authUser.middleware.ts     # JWT validation for Express routes
│   ├── authSocket.middleware.ts   # JWT authentication for Socket.io connections
│   ├── validateBody.middleware.ts # Zod request body validation middleware
│   └── upload.middleware.ts       # Multer file upload handling
├── models/
│   ├── user.model.ts              # Mongoose user model (IUserDocument extends BaseUser)
│   ├── chat.model.ts              # Mongoose chat message model (senderUid, receiverUid)
│   ├── friend-request.model.ts    # Mongoose friend request model (status enum)
│   └── friend.model.ts            # Mongoose bi-directional friendship model
├── repository/
│   ├── user.repository.ts         # User database queries & creation
│   ├── chat.repository.ts         # Message queries, seen/delivered updates
│   ├── friend-request.repository.ts # Friend request lifecycle queries
│   └── friend.repository.ts       # Friendship queries & helpers
├── routes/
│   ├── auth.routes.ts             # /api/auth endpoints
│   ├── chat.routes.ts             # /api/chat endpoints
│   ├── user.routes.ts             # /api/user endpoints
│   └── ai.routes.ts               # /api/ai endpoints
├── services/
│   ├── bcrypt.service.ts          # Password hashing and comparison
│   ├── jwt.service.ts             # Token generation and verification
│   ├── email.service.ts           # OTP generation and email dispatch
│   ├── image.service.ts           # Sharp resizing pipeline
│   ├── cloudinary.service.ts      # Cloudinary upload helpers
│   └── groq.service.ts            # AI service (prompts, structured outputs)
├── sockets/
│   ├── chat.socket.ts             # Messaging and seen message events
│   ├── user.socket.ts             # Presence and friend request socket events
│   ├── call.socket.ts             # WebRTC video calling signaling
│   └── settings.socket.ts         # Live language & summarization updates
└── store/
    └── sessionStore.ts            # In-memory connected user registry
```

---

## 🗄️ Database Models

All models use **camelCase** for consistency across the entire stack:

### 1. User (`models/user.model.ts`)
```ts
export interface IUserDocument extends BaseUser {
  uid: string;       // Unique 5-char nanoid
  password: string;  // Hashed password
}
```
* Fields: `username`, `firstname`, `lastname`, `email`, `profile`, `uid`, `password`, `settings: { translation, summarization }`.

### 2. Chat Message (`models/chat.model.ts`)
* Fields: `senderUid`, `receiverUid`, `text`, `type` (`"text" | "image"`), `seen` (delivery status), `translatedText: [{ language, translatedText }]`.

### 3. Friend Request (`models/friend-request.model.ts`)
* Fields: `senderUid`, `receiverUid`, `status` (`"Pending" | "Accepted" | "Rejected"`).

### 4. Friend (`models/friend.model.ts`)
* Compound unique index on `{ user1: 1, user2: 1 }` with alphabetical normalization to prevent duplicate friendships.

---

## 🌐 REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Validation Schema |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user (multipart for profile picture) | `signupReqSchema` |
| `POST` | `/api/auth/signin` | Sign in with email and password | `signinReqSchema` |
| `POST` | `/api/auth/getuser` | Fetch current user profile (JWT auth) | Protected |
| `POST` | `/api/auth/send-email-otp` | Send verification OTP to email | `sendEmailOtpReqSchema` |

### Chat & Users (`/api/chat` & `/api/user`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat/getFriends` | Get user's friend list and chat history |
| `POST` | `/api/chat/upload` | Upload image message attachment to Cloudinary |
| `GET` | `/api/user/search?q=:query` | Search users by username, name, or UID |

### AI Services (`/api/ai`)
| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chatbot` | Conversational AI response with custom tone | `{ message, tone, history }` |
| `POST` | `/api/ai/analyze-image`| Visual image analysis & description | `{ url, prompt }` |
| `POST` | `/api/ai/translate` | Batch translate messages to a target language | `{ messages: [{ id, text }], to }` |
| `POST` | `/api/ai/summarize` | Summarize conversation transcript | `{ conversation, format }` |

---

## ⚡ WebSocket Events

Handled via Socket.io with verified JWT handshake authentication (`authSocket` middleware).

### Client to Server Events
* `chat:sendmessage`: Sends a message to a recipient.
* `chat:seenmessages`: Marks incoming messages as seen.
* `user:sendchatrequest`: Sends a friend request.
* `user:requestanswer`: Accepts or rejects a friend request.
* `call:videocalloutgoing`: Initiates WebRTC video call offer.
* `call:videocallanswer`: Replies with WebRTC video call answer.
* `call:videocallcanceled`: Cancels active or ringing video call.
* `settings:translate:languageChange`: Live updates user translation language.
* `settings:summarization:formatChange`: Live updates preferred summary format.

### Server to Client Events
* `chat:receivemessage`: Dispatches incoming message to recipient.
* `chat:seenmessages`: Notifies sender that messages have been seen.
* `user:friendonline` / `user:friendoffline`: Presence change broadcasts.
* `user:requestfromuser`: Dispatches incoming friend request with sender's `UserPreview`.
* `call:videocallincoming`: Alerts recipient of incoming call.
* `call:videocallringing`: Alerts caller that recipient's phone is ringing.
* `call:videocallanswer`: Delivers WebRTC answer to caller.
* `call:videocallcanceled`: Delivers call cancellation.

---

## 🤖 AI Integration (Groq Cloud)

The backend utilizes Groq's high-speed inference engine (`Llama 3.3 70B` and `Llama 3.2 11B Vision`):
* **Custom Chatbot Persona:** Generates responses tailored to selected tones (`normal`, `friendly`, `formal`, `sarcastic`, `compassionate`, `humorous`).
* **Structured Output Validation:** Summarization and translation outputs are validated server-side using Zod schemas (`structuredSummarySchema`, `translateMessagesResponseSchema`) before returning to clients.

---

## ⚙️ Environment Variables

Create `.env` inside `Gossip_Backend/`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/gossip
JWT_SECRET=super_secret_jwt_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Groq AI
GROQ_API_KEY=gsk_your_groq_api_key

# Nodemailer
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

---

## 🚀 Development & Scripts

All scripts can be run from `Gossip_Backend/` or via the root monorepo:

```bash
# Start development server with live watch mode:
npm run dev

# Run TypeScript typecheck without emitting:
npm run typecheck

# Run unit tests with Vitest:
npm test

# Build production bundle using tsup:
npm run build

# Start production server:
npm start
```

---

## 🌐 Production Deployment (Render)

The backend uses `tsup` configured with `noExternal: ["@gossip/shared"]`, which inlines the shared TypeScript schemas directly into `dist/index.js`. This guarantees that the production build is a standalone Node.js executable with zero TypeScript runtime dependencies.

### Render Web Service Settings:
* **Root Directory:** *(leave blank / repository root)*
* **Build Command:**
  ```bash
  npm run install:backend && npm run build:backend
  ```
* **Start Command:**
  ```bash
  npm run start:backend
  ```
