"use client";

import { useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Button, Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { resendVerification } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function AccountPage() {
  const { t, authUser, refreshMe } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const items = [
    [t({ de: "Offene Bestellungen", en: "Open orders" }), "1"],
    [t({ de: "Laufende Gebote", en: "Active bids" }), "2"],
    [t({ de: "Ungelesene Nachrichten", en: "Unread messages" }), "1"],
  ];

  async function resend() {
    setBusy(true);
    setMessage("");
    try {
      await resendVerification();
      setMessage(t({ en: "Verification email sent." }));
      await refreshMe();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t({ en: "Request failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Guten Tag.", en: "Hello." })}</h1>
      {authUser && !authUser.email_verified_at ? (
        <div className="mt-4 space-y-3">
          <Notice>
            {t({ en: "Please verify your email to unlock all account features." })}
          </Notice>
          <Button type="button" variant="accent" disabled={busy} onClick={() => void resend()}>
            {busy ? "…" : t({ en: "Resend verification email" })}
          </Button>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
    </Desk>
  );
}
