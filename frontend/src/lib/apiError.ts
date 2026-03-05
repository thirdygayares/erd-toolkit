import axios from "axios";

function getResponseDetail(data: unknown): string | null {
  if (!data) {
    return null;
  }
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    const message = record.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (Array.isArray(detail)) {
      const joined = detail
        .map((item) =>
          typeof item === "string" ? item : JSON.stringify(item),
        )
        .filter(Boolean)
        .join("; ");
      if (joined) {
        return joined;
      }
    }
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseDetail = getResponseDetail(error.response?.data);
    if (responseDetail) {
      return responseDetail;
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Check backend/API availability.";
    }
    if (error.message === "Network Error") {
      return "Cannot reach backend API. Verify API base URL and server status.";
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
