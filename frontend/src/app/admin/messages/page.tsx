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

const STATUS_LABELS: Record<string, { de: string; en: string }> = {
  open: { de: "Offen", en: "Open" },
  answered: { de: "Beantwortet", en: "Answered" },
  accepted: { de: "Angenommen", en: "Accepted" },
  rejected: { de: "Abgelehnt", en: "Rejected" },
  closed: { de: "Geschlossen", en: "Closed" },
};

const TYPE_LABELS: Record<string, { de: string; en: string }> = {
  inquiry: { de: "Anfrage", en: "Inquiry" },
  offer: { de: "Preisangebot", en: "Offer" },
  quote: { de: "Angebotsanfrage", en: "Quote request" },
  contact: { de: "Kontakt", en: "Contact" },
};

export default function AdminMessagesPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const response = await adminFetchInquiries();
    setItems(response.data);
  }

  useEffect(() => {
    if (!can("admin.messages")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.messages")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  async function onReply(event: FormEvent, item: ApiInquiry) {
    event.preventDefault();
    const text = replyDraft[item.id]?.trim();
    if (!text) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await adminReplyInquiry(item.id, text, "answered");
      setReplyDraft((current) => ({ ...current, [item.id]: "" }));
      setNotice(t({ de: "Antwort gesendet.", en: "Reply sent." }));
      await load();
    } catch {
      setError(t({ de: "Antwort fehlgeschlagen.", en: "Reply failed." }));
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(item: ApiInquiry, status: "accepted" | "rejected") {
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await adminUpdateInquiryStatus(item.id, status);
      setNotice(
        status === "accepted"
          ? t({ de: "Anfrage angenommen.", en: "Request accepted." })
          : t({ de: "Anfrage abgelehnt.", en: "Request rejected." }),
      );
      await load();
    } catch {
      setError(
        status === "accepted"
          ? t({ de: "Annehmen fehlgeschlagen.", en: "Accept failed." })
          : t({ de: "Ablehnen fehlgeschlagen.", en: "Reject failed." }),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Nachrichten / Anfragen", en: "Messages / Inquiries" })}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t({
          de: "Senden = Textantwort. Annehmen / Ablehnen = Entscheidung zu Angebot oder Anfrage (ohne Text).",
          en: "Send = text reply. Accept / Reject = decide on an offer or request (no text required).",
        })}
      </p>
      {notice ? <p className="mt-4 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <p className="rounded-3xl border border-line bg-white px-4 py-8 text-sm text-muted">
            {t({ de: "Keine Nachrichten.", en: "No messages." })}
          </p>
        ) : null}
        {items.map((item) => {
          const isOfferLike = item.type === "offer" || item.type === "quote";
          const decided = item.status === "accepted" || item.status === "rejected";
          return (
            <article key={item.id} className="rounded-3xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>
                  {t(TYPE_LABELS[item.type] ?? { de: item.type, en: item.type })} ·{" "}
                  <span className="font-medium text-ink">
                    {t(STATUS_LABELS[item.status] ?? { de: item.status, en: item.status })}
                  </span>
                </span>
                <span>{item.user?.email || item.guest_email || t({ de: "Gast", en: "guest" })}</span>
              </div>
              <p className="mt-2 text-sm font-medium">
                {item.product ? t(item.product.name) : "—"}
                {item.offer_amount != null
                  ? ` · ${t({ de: "Angebot", en: "offer" })} ${item.offer_amount} €`
                  : ""}
              </p>
              <p className="mt-3 text-sm">{item.message}</p>
              {item.admin_reply ? (
                <p className="mt-3 rounded-2xl bg-paper px-3 py-2 text-sm text-muted">
                  {t({ de: "Ihre Antwort", en: "Your reply" })}: {item.admin_reply}
                </p>
              ) : null}

              <form className="mt-4 space-y-3" onSubmit={(event) => void onReply(event, item)}>
                <div className="flex flex-wrap gap-2">
                  <input
                    className={`${fieldClass} min-w-[16rem] flex-1`}
                    placeholder={t({ de: "Antwort schreiben…", en: "Write a reply…" })}
                    value={replyDraft[item.id] ?? ""}
                    onChange={(event) => setReplyDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                  <Button type="submit" disabled={busyId === item.id}>
                    {t({ de: "Senden", en: "Send" })}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <p className="mr-auto text-xs text-muted">
                    {isOfferLike
                      ? t({
                          de: "Für Angebote: annehmen oder ablehnen.",
                          en: "For offers: accept or reject.",
                        })
                      : t({
                          de: "Optional: Anfrage schließen durch Annehmen/Ablehnen.",
                          en: "Optional: close the request by accepting/rejecting.",
                        })}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === item.id || item.status === "accepted"}
                    onClick={() => void setStatus(item, "accepted")}
                  >
                    {t({ de: "Annehmen", en: "Accept" })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busyId === item.id || item.status === "rejected"}
                    onClick={() => void setStatus(item, "rejected")}
                  >
                    {t({ de: "Ablehnen", en: "Reject" })}
                  </Button>
                </div>
                {decided ? (
                  <p className="text-xs text-muted">
                    {item.status === "accepted"
                      ? t({ de: "Status: angenommen.", en: "Status: accepted." })
                      : t({ de: "Status: abgelehnt.", en: "Status: rejected." })}
                  </p>
                ) : null}
              </form>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
