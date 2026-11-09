"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiInboxNotification,
} from "@/lib/notification-api";
import { getEcho, reverbEnabled } from "@/lib/echo";

export function useInboxRealtime(userId: number | null | undefined, enabled = true) {
  const [items, setItems] = useState<ApiInboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId || !enabled) return;
    const response = await fetchMyNotifications();
    setItems(response.data);
    setUnread(response.meta?.unread ?? response.data.filter((item) => !item.read_at).length);
  }, [userId, enabled]);

  useEffect(() => {
    if (!userId || !enabled) return;
    void load().catch(() => setError("Failed to load notifications"));
  }, [userId, enabled, load]);

  useEffect(() => {
    if (!userId || !enabled || !reverbEnabled()) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`user.${userId}`);
    setConnected(true);

    channel.listen(".inbox.created", (payload: { notification?: ApiInboxNotification }) => {
      const note = payload.notification;
      if (!note) return;
      setItems((current) => [note, ...current.filter((item) => item.id !== note.id)].slice(0, 100));
      if (!note.read_at) setUnread((count) => count + 1);
    });

    return () => {
      echo.leave(`user.${userId}`);
      setConnected(false);
    };
  }, [userId, enabled]);

  async function markRead(id: number) {
    const wasUnread = items.some((item) => item.id === id && !item.read_at);
    await markNotificationRead(id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item)),
    );
    if (wasUnread) setUnread((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  return { items, unread, connected, error, load, markRead, markAllRead, realtime: reverbEnabled() };
}
