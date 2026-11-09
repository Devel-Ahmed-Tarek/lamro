"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { apiUrl, getToken } from "@/lib/api";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<"reverb">;
  }
}

let echoClient: Echo<"reverb"> | null = null;
let echoToken: string | null = null;

export function reverbEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_REVERB_APP_KEY);
}

export function getEcho(): Echo<"reverb"> | null {
  if (typeof window === "undefined") return null;
  if (!reverbEnabled()) return null;

  const token = getToken();
  if (echoClient && echoToken === token) return echoClient;

  if (echoClient) {
    try {
      echoClient.disconnect();
    } catch {
      /* ignore */
    }
    echoClient = null;
  }

  window.Pusher = Pusher;
  echoToken = token;

  echoClient = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "127.0.0.1",
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http") === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiUrl()}/api/broadcasting/auth`,
    auth: {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
    },
  });

  return echoClient;
}

export function resetEcho() {
  if (echoClient) {
    try {
      echoClient.disconnect();
    } catch {
      /* ignore */
    }
  }
  echoClient = null;
  echoToken = null;
}
