import axios, { type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") {
    return config;
  }

  const userId = window.localStorage.getItem("ERD_USER_ID");
  const shareSlug = window.localStorage.getItem("ERD_SHARE_SLUG");

  if (userId) {
    config.headers.set("X-User-Id", userId);
  }

  if (shareSlug) {
    config.headers.set("X-Share-Slug", shareSlug);
  }

  return config;
});
