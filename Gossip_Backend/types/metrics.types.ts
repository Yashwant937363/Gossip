export type HttpRouteType = "normal" | "ai";

export type HttpErrorType = "client_error" | "server_error";

export type AppErrorSource =
  | "http"
  | "ai"
  | "socket_conn"
  | "socket_event"
  | "global";

export type AppErrorSeverity = "warn" | "error";

export type AppOperationType = "http" | "ai" | "socket_conn" | "socket_event";

export type SocketConnectionErrorReason =
  | "missing_token"
  | "invalid_token"
  | "user_not_found"
  | "unknown";

export type SocketEventStatus = "success" | "error";

export type SocketEventErrorType = "operational" | "unhandled";

export interface SocketEventErrorInfo {
  code: string;
  isOperational: boolean;
}
