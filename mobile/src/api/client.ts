import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  if (configured && !configured.includes("localhost")) return configured;

  // Android emulator can't hit the host's localhost.
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return configured ?? "http://localhost:8000";
}

export const API_BASE_URL = resolveBaseUrl();

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}
