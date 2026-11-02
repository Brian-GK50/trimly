import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string; message?: string | string[] }>(error)) {
    const message = error.response?.data?.message ?? error.response?.data?.error;
    return Array.isArray(message) ? message[0] ?? fallback : message ?? fallback;
  }
  return fallback;
}