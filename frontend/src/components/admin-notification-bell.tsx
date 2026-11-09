"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";
import { useStore } from "@/lib/store";

function timeAgo(iso: string | null | undefined, locale: "de" | "en") {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "de" ? "gerade eben" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function AdminNotificationBell() {
  const { t, locale, authUser, can } = useStore();
  const enabled = Boolean(authUser?.id && can("admin.overview"));
  const { items, unread, connected, markRead, markAllRead } = useInboxRealtime(authUser?.id, enabled);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!enabled) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-copper/40"
        aria-label={t({ de: "Benachrichtigungen", en: "Notifications" })}
      >
        <span className="text-lg leading-none">⌁</span>
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-copper px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-12 right-0 z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_-28px_rgba(18,18,18,0.55)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t({ de: "Live-Inbox", en: "Live inbox" })}</p>
              <p className="text-[11px] text-muted">
                {connected
                  ? t({ de: "Reverb verbunden", en: "Reverb connected" })
                  : t({ de: "Polling / offline", en: "Polling / offline" })}
              </p>
            </div>
            {unread > 0 ? (
              <button type="button" className="text-xs text-copper" onClick={() => void markAllRead()}>
                {t({ de: "Alle gelesen", en: "Mark all read" })}
              </button>
            ) : null}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">
                {t({ de: "Keine Benachrichtigungen.", en: "No notifications." })}
              </li>
            ) : (
              items.slice(0, 20).map((item) => {
                const inner = (
                  <div className="flex gap-3 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-line" : "bg-copper"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="shrink-0 text-[10px] text-muted">{timeAgo(item.created_at, locale)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{item.body}</span>
                    </span>
                  </div>
                );

                return (
                  <li key={item.id} className={`border-t border-line ${item.read_at ? "" : "bg-paper/60"}`}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="block transition hover:bg-paper"
                        onClick={() => {
                          if (!item.read_at) void markRead(item.id);
                          setOpen(false);
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="block w-full text-left transition hover:bg-paper"
                        onClick={() => {
                          if (!item.read_at) void markRead(item.id);
                        }}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
