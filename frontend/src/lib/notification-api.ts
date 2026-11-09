import { api } from "@/lib/api";

export type ApiInboxNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string | null;
};

type Envelope<T> = { data: T; meta?: { unread?: number } };

export async function fetchMyNotifications() {
  return api<Envelope<ApiInboxNotification[]>>("/api/v1/me/notifications");
}

export async function markNotificationRead(id: number) {
  return api<Envelope<ApiInboxNotification>>(`/api/v1/me/notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead() {
  return api<Envelope<{ ok: boolean }>>("/api/v1/me/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
