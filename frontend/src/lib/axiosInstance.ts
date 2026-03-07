import axios, { type InternalAxiosRequestConfig } from "axios";

import { getBrowserCookie, getStoredShareSlug } from "@/lib/authStorage";

const API_BASE_URL =
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : "http://127.0.0.1:8000/api/v1");

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") {
    return config;
  }

  const shareSlug = getStoredShareSlug();
  const csrfToken = getBrowserCookie("erd_csrf_token");

  if (shareSlug) {
    config.headers.set("X-Share-Slug", shareSlug);
  }

  if (csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }

  return config;
});
