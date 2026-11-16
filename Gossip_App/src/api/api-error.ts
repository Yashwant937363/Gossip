import axios from "axios";
import type { APIError } from "@gossip/shared";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (axios.isAxiosError<APIError>(error)) {
    return error.response?.data?.error || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}
