import axios from "axios";
import Cookies from "js-cookie";
import {
  AnalyzeImageInput,
  ChatbotInput,
  ChatbotResult,
  GetFriendsAndChatsResponse,
  GetUserResponse,
  ImageAnalysisResult,
  SearchUsersResponse,
  SigninReq,
  SigninResponse,
  SignupResponse,
  SummarizationInput,
  SummarizationResult,
  TranslateMessagesInput,
  TranslateMessagesResult,
  UploadChatImageResponse,
} from "@gossip/shared";

const SERVER_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:5000";

export const getAuthToken = (): string => {
  return Cookies.get("authtoken") || "";
};

export const api = axios.create({
  baseURL: SERVER_URL,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const apiSignUp = async (formData: FormData) => {
  const response = await api.post<SignupResponse>(
    "/api/auth/signup",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export const apiSignIn = async (signInData: SigninReq) => {
  const response = await api.post<SigninResponse>(
    "/api/auth/signin",
    signInData,
  );
  return response.data;
};

export const apiGetUser = async (token?: string) => {
  const authToken = token || getAuthToken();
  const response = await api.post<GetUserResponse>(
    "/api/auth/getuser",
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );
  return response.data;
};

export const apiSendEmailOtp = async (email: string) => {
  const response = await api.post("/api/auth/send-email-otp", { email });
  return response.data;
};

// Chat APIs
export const apiUploadImage = async (file: File | Blob) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post<UploadChatImageResponse>(
    "/api/chat/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export const apiGetFriends = async (token?: string) => {
  const authToken = token || getAuthToken();
  const response = await api.post<GetFriendsAndChatsResponse>(
    "/api/chat/getFriends",
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );
  return response.data;
};

// User APIs
export const apiSearchUsers = async (query: string) => {
  const response = await api.get<SearchUsersResponse>(
    `/api/user/search?q=${encodeURIComponent(query)}`,
  );
  return response.data;
};

// AI APIs
export const apiChatbot = async (data: ChatbotInput) => {
  const response = await api.post<ChatbotResult>("/api/ai/chatbot", data);
  return response.data;
};

export const apiAnalyzeImage = async (data: AnalyzeImageInput) => {
  const response = await api.post<ImageAnalysisResult>(
    "/api/ai/analyze-image",
    data,
  );
  return response.data;
};

export const apiTranslate = async (data: TranslateMessagesInput) => {
  const response = await api.post<TranslateMessagesResult>(
    "/api/ai/translate",
    data,
  );
  return response.data;
};

export const apiSummarize = async (data: SummarizationInput) => {
  const response = await api.post<SummarizationResult>(
    "/api/ai/summarize",
    data,
  );
  return response.data;
};
