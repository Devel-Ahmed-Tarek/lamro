"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button, fieldClass } from "@/components/ui";
import {
  adminFetchInquiries,
  adminReplyInquiry,
  adminUpdateInquiryStatus,
  type ApiInquiry,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function AdminMessagesPage() {
  const { t, locale, can } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const response = await adminFetchInquiries();
    setItems(response.data);
  }

  useEffect(() => {
    if (!can("admin.messages")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.messages")) {
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  async function onReply(event: FormEvent, item: ApiInquiry) {
    event.preventDefault();
    const text = replyDraft[item.id]?.trim();
    if (!text) return;
    try {
      await adminReplyInquiry(item.id, text, "answered");
      setReplyDraft((current) => ({ ...current, [item.id]: "" }));
      await load();
    } catch {
      setError(t({ de: "Antwort fehlgeschlagen.", en: "Reply failed." }));
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Nachrichten / Anfragen", en: "Messages / Inquiries" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="font-mono">{item.type} · {item.status}</span>
              <span>{item.user?.email || item.guest_email || "guest"}</span>
            </div>
            <p className="mt-2 text-sm font-medium">
              {item.product
                ? (locale === "de" ? item.product.name.de : item.product.name.en)
                : "—"}
              {item.offer_amount != null ? ` · offer ${item.offer_amount} €` : ""}
            </p>
            <p className="mt-3 text-sm">{item.message}</p>
            {item.admin_reply ? <p className="mt-3 text-sm text-muted">Reply: {item.admin_reply}</p> : null}
            <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => void onReply(event, item)}>
              <input
                className={fieldClass}
                placeholder={t({ de: "Antwort", en: "Reply" })}
                value={replyDraft[item.id] ?? ""}
                onChange={(event) => setReplyDraft((current) => ({ ...current, [item.id]: event.target.value }))}
              />
              <Button type="submit">{t({ de: "Senden", en: "Send" })}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void adminUpdateInquiryStatus(item.id, "accepted").then(load)}
              >
                {t({ de: "Annehmen", en: "Accept" })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void adminUpdateInquiryStatus(item.id, "rejected").then(load)}
              >
                {t({ de: "Ablehnen", en: "Reject" })}
              </Button>
            </form>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
