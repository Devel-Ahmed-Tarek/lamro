"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Button, Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { formatMoney, type Copy } from "@/lib/catalog";
import { checkoutAuctionWin, fetchWonAuctions, type ApiWonAuction } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

function label(name: Copy | undefined, locale: "de" | "en") {
  if (!name) return "—";
  return name[locale] || name.en || name.de;
}

export default function WonAuctionsPage() {
  const { t, locale, authUser } = useStore();
  const [items, setItems] = useState<ApiWonAuction[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const response = await fetchWonAuctions();
    setItems(response.data);
  }

  useEffect(() => {
    if (!authUser) return;
    load().catch(() => setError(t({ de: "Gewonnene Auktionen nicht geladen.", en: "Could not load won auctions." })));
  }, [authUser, t]);

  async function pay(auction: ApiWonAuction) {
    setBusyId(auction.id);
    setError("");
    setNote("");
    try {
      const order = await checkoutAuctionWin(auction.id, {
        shipping_name: authUser?.name,
        shipping_country: "DE",
      });
      setNote(`${t({ de: "Auftrag angelegt", en: "Order created" })}: ${order.data.number}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Checkout fehlgeschlagen.", en: "Checkout failed." }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Gewonnene Auktionen", en: "Won auctions" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {note ? <p className="mt-4 text-sm text-moss">{note}</p> : null}
      {items.length === 0 ? (
        <div className="mt-6"><Notice>{t({ de: "Keine gewonnenen Auktionen.", en: "No won auctions." })}</Notice></div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-4">
              <div>
                <Link href={`/auctions/${item.slug}`} className="font-medium">{label(item.product?.name, locale)}</Link>
                <p className="mt-1 font-mono text-xs text-muted">{item.product?.part_number} · {formatMoney(item.current_price, locale)}</p>
              </div>
              {item.payment_pending ? (
                <Button disabled={busyId === item.id} onClick={() => void pay(item)}>
                  {t({ de: "Gewonnenes Los bezahlen", en: "Pay for won auction" })}
                </Button>
              ) : (
                <Link href="/account/orders" className="text-sm text-copper">{t({ de: "Auftrag ansehen", en: "View order" })}</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Desk>
  );
}
