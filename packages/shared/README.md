# @gossip/shared

The **Single Source of Truth** for the Gossip monorepo. This package contains shared TypeScript types, Zod schemas, socket event definitions, and API data transfer objects (DTOs) used across both the frontend (`Gossip_App`) and backend (`Gossip_Backend`).

---

## 📦 Package Overview

- **Zero-Build Developer Experience:** Exported directly as TypeScript source files (`./src/index.ts`). You never need to run a manual build or watch step when editing schemas here.
- **Runtime Validation:** Built with [Zod](https://zod.dev) for end-to-end request/response validation.
- **Single Source of Truth:** Core domain entities (like `baseUserSchema`) are defined once; all requests, responses, previews, and database models extend or pick from them.

---

## 📁 Directory Structure

```
packages/shared/
├── src/
│   ├── index.ts                     # Package entry point (re-exports all modules)
│   ├── schemas/
│   │   ├── user.schema.ts           # Base user, public user, and user preview schemas
│   │   ├── auth.schema.ts           # Signup/Signin requests & response DTOs
│   │   ├── settings.schema.ts       # Translation & summarization settings schemas
│   │   └── groq.schema.ts           # AI / Groq structured output schemas
│   └── types/
│       ├── chat.types.ts            # IChat, Friend, message formats, and delivery status
│       ├── friend-request.types.ts  # IFriendRequest, FriendRequestStatus, search responses
│       ├── socket.types.ts          # Socket.io event enums and payload interfaces
│       ├── groq.types.ts            # AI inputs, results, prompts, and tone types
│       └── error.types.ts           # Standard APIError response interface
├── package.json
└── tsconfig.json
```

---

## 🧩 Key Modules & Exports

### 1. User Schemas (`schemas/user.schema.ts`)
* **`baseUserSchema` / `BaseUser`**: Core user fields (`username`, `firstname`, `lastname`, `email`, `profile`, `settings`).
* **`publicUserSchema` / `IPublicUser`**: Public user object safe for client consumption (`baseUserSchema + uid`).
* **`userPreviewSchema` / `UserPreview`**: Minimal public user badge (`uid`, `username`, `profile`) used in search results, avatar lists, and socket notifications.

### 2. Auth Schemas (`schemas/auth.schema.ts`)
* **`signupReqSchema` / `SignupReq`**: Validates registration requests (`baseUserSchema + password`).
* **`signinReqSchema` / `SigninReq`**: Validates login credentials (`email` picked from base + `password`).
* **`signupResponseSchema` / `SignupResponse`**: `{ authtoken: string, uid: string }`.
* **`signinResponseSchema` / `SigninResponse`**: `publicUserSchema + authtoken + msg`.
* **`getUserResponseSchema` / `GetUserResponse`**: `{ msg: string, user: publicUserSchema }`.
* **`sendEmailOtpReqSchema` / `SendEmailOtpReq`**: Validates email for OTP delivery.

### 3. Chat & Messaging (`types/chat.types.ts`)
* **`IChat`**: Core message interface:
  ```ts
  export interface IChat {
    _id?: string;
    senderUid: string;
    receiverUid: string;
    text: string;
    seen: SeenChatType;
    type: MessageType; // "text" | "image"
    translatedText: ITranslatedChat[];
    createdAt?: Date;
    updatedAt?: Date;
  }
  ```
* **`Friend`**: `UserPreview & { online?: boolean }`.
* **`MessageFormat` / `MessageType`**: Enum and union (`"text" | "image"`).
* **`SeenChat` / `SeenChatType`**: Message delivery lifecycle states (`Seen: true`, `Received: false`, `Sent: null`).
* **`GetFriendsAndChatsResponse`**: Payload returning contacts and message history.

### 4. Friend Requests (`types/friend-request.types.ts`)
* **`FriendRequestStatus`**: Enum with `PENDING`, `ACCEPTED`, `REJECTED`.
* **`IFriendRequest`**: Friend connection request interface (`senderUid`, `receiverUid`, `status`).
* **`SearchUsersResponse`**: `{ msg: string, users: SearchUserItem[] }`.

### 5. WebSocket Contracts (`types/socket.types.ts`)
* **`ServertoClientEvents`**: Enum of events the server emits (`chat:receivemessage`, `user:friendonline`, `user:requestfromuser`, etc.).
* **`ClientToServerEvents`**: Enum of events the client emits (`chat:sendmessage`, `chat:seenmessages`, `call:videocalloutgoing`, etc.).
* **`ServerToClientEventsTypes`** & **`ClientToServerEventsTypes`**: Type-safe listener maps for Socket.io.
* **`UserSession`**: `UserPreview & { settings: UserSettings; online?: boolean }`.
* **`SendMessagePayload`**: `{ touid: string, message: string, type: MessageType }`.

### 6. Settings (`schemas/settings.schema.ts`)
* **`SUMMARIZATION_FORMATS`**: `["paragraph", "bullet", "structured"]`.
* **`translationSettingsSchema` / `TranslationSettings`**: `{ language: string, alwaysTranslate: boolean }`.
* **`summarizationSettingsSchema` / `SummarizationSettings`**: `{ format: SummarizationFormat }`.
* **`userSettingsSchema` / `UserSettings`**: `{ translation, summarization }`.

### 7. AI & Groq (`schemas/groq.schema.ts` & `types/groq.types.ts`)
* **`ImageAnalysisResult`**: Structured response for image description and details.
* **`SummarizationResult`**: Formatted conversation summaries (bullet, paragraph, or structured).
* **`TranslateMessagesResult`**: Batch translation output array.
* **`ChatbotInput` & `ChatbotResult`**: AI chatbot query and formatted response with `tone`.
* **`Tone`**: `"normal" | "friendly" | "formal" | "sarcastic" | "compassionate" | "humorous"`.

---

## 🛠️ Usage

### In Backend (`Gossip_Backend`)
```ts
import { 
  signinReqSchema, 
  SigninReq, 
  IChat, 
  UserPreview 
} from "@gossip/shared";

// Route validation:
router.post("/signin", validateBody(signinReqSchema), signinUser);

// Controller typing:
export const signinUser = async (req: Request<{}, {}, SigninReq>) => { ... };
```

### In Frontend (`Gossip_App`)
```ts
import { 
  apiSignIn, 
  SigninReq, 
  IChat, 
  Friend 
} from "@gossip/shared";

// Typed API call:
const response = await apiSignIn({ email, password });
```
