"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Button, Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchMyBids } from "@/lib/auction-api";
import { fetchMyOrders } from "@/lib/commerce-api";
import { fetchMyNotifications } from "@/lib/notification-api";
import { resendVerification } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function AccountPage() {
  const { t, authUser, refreshMe, ready } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [openOrders, setOpenOrders] = useState(0);
  const [activeBids, setActiveBids] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!ready || !authUser) return;
    void Promise.all([
      fetchMyOrders()
        .then((response) => {
          const rows = response.data ?? [];
          setOpenOrders(rows.filter((order) => !["cancelled", "delivered", "returned", "refunded"].includes(order.status)).length);
        })
        .catch(() => setOpenOrders(0)),
      fetchMyBids()
        .then((response) => setActiveBids((response.data ?? []).length))
        .catch(() => setActiveBids(0)),
      fetchMyNotifications()
        .then((response) => {
          const rows = response.data ?? [];
          const metaUnread = response.meta?.unread;
          setUnread(typeof metaUnread === "number" ? metaUnread : rows.filter((row) => !row.read_at).length);
        })
        .catch(() => setUnread(0)),
    ]);
  }, [ready, authUser]);

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

  const items = [
    { label: t({ de: "Offene Bestellungen", en: "Open orders" }), value: String(openOrders), href: "/account/orders" },
    { label: t({ de: "Laufende Gebote", en: "Active bids" }), value: String(activeBids), href: "/account/bids" },
    { label: t({ de: "Ungelesene Nachrichten", en: "Unread messages" }), value: String(unread), href: "/account/messages" },
  ];

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Guten Tag.", en: "Hello." })}</h1>
      {authUser && !authUser.email_verified_at ? (
        <div className="mt-4 space-y-3">
          <Notice>{t({ en: "Please verify your email to unlock all account features." })}</Notice>
          <Button type="button" variant="accent" disabled={busy} onClick={() => void resend()}>
            {busy ? "…" : t({ en: "Resend verification email" })}
          </Button>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-line bg-white p-4 transition hover:border-copper/40">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
          </Link>
        ))}
      </div>
    </Desk>
  );
}
