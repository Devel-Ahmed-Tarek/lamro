"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Button, ConditionBadge, Field, Notice, Plate, TestingBadge, fieldClass } from "@/components/ui";
import { useAuctionRealtime } from "@/hooks/use-auction-realtime";
import { ApiError } from "@/lib/api";
import {
  applyToAuction,
  buyNowRequest,
  cancelProxyRequest,
  fetchAuction,
  formatEndsIn,
  placeBidRequest,
  setProxyRequest,
  type ApiAuction,
} from "@/lib/auction-api";
import { formatMoney } from "@/lib/catalog";
import { checkoutAuctionWin } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function AuctionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale, features, role, authUser, watch, toggleWatch } = useStore();
  const [seed, setSeed] = useState<ApiAuction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState(0);
  const [max, setMax] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { auction, setAuction, connected, realtime } = useAuctionRealtime(slug, seed);

  const load = useCallback(async () => {
    try {
      const response = await fetchAuction(slug);
      setSeed(response.data);
      setAuction(response.data);
      setBid(response.data.current_price + response.data.increment);
      setMax(response.data.current_price + response.data.increment * 4);
      setError("");
    } catch {
      setSeed(null);
      setAuction(null);
      setError(t({ de: "Auktion nicht gefunden.", en: "Auction not found." }));
    } finally {
      setLoading(false);
    }
  }, [setAuction, slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!auction) return;
    setBid(auction.current_price + auction.increment);
  }, [auction?.current_price, auction?.increment, auction?.version]);

  if (loading) return <Frame><p className="text-sm text-muted">Loading…</p></Frame>;
  if (!auction || !auction.product) return <Frame><Notice>{error || t({ de: "Auktion nicht gefunden.", en: "Auction not found." })}</Notice></Frame>;

  const product = auction.product;
  const upcoming = auction.status === "scheduled";
  const live = auction.status === "live";
  const appStatus = auction.my_application?.status;
  const approved = appStatus === "approved";
  const loggedIn = Boolean(authUser) && role === "customer";
  const isWinner = Boolean(authUser && auction.winner_user_id === authUser.id && auction.status === "ended");

  async function onApply() {
    if (!auction) return;
    setBusy(true);
    setError("");
    try {
      await applyToAuction(auction.id);
      setNote(t({ de: "Antrag gesendet. Warte auf Freigabe.", en: "Application sent. Waiting for approval." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Antrag fehlgeschlagen.", en: "Application failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onBid(event: React.FormEvent) {
    event.preventDefault();
    if (!auction) return;
    setBusy(true);
    setError("");
    try {
      const response = await placeBidRequest(auction.id, bid);
      setAuction(response.data.auction);
      setSeed(response.data.auction);
      setNote(t({ de: "Gebot liegt vorne.", en: "You are leading." }));
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.amount?.[0] ?? err.errors?.auction?.[0] ?? err.message) : t({ de: "Gebot fehlgeschlagen.", en: "Bid failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onProxy(event: React.FormEvent) {
    event.preventDefault();
    if (!auction) return;
    setBusy(true);
    setError("");
    try {
      const response = await setProxyRequest(auction.id, max);
      setAuction(response.data.auction);
      setSeed(response.data.auction);
      setNote(t({ de: "Automatisches Bieten gespeichert.", en: "Automatic bidding saved." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Speichern fehlgeschlagen.", en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onBuyNow() {
    if (!auction) return;
    setBusy(true);
    try {
      const response = await buyNowRequest(auction.id);
      setAuction(response.data.auction);
      setSeed(response.data.auction);
      setNote(t({ de: "Sofortkauf abgeschlossen.", en: "Buy now completed." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Sofortkauf fehlgeschlagen.", en: "Buy now failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <Plate brand={product.manufacturer ?? "Jala"} part={product.part_number ?? ""} />
          <div className="mt-6 flex flex-wrap gap-2">
            {product.condition ? <ConditionBadge value={product.condition as "new"} /> : null}
            {product.testing ? <TestingBadge value={product.testing as "tested"} /> : null}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t(product.name)}</h1>
          <p className="mt-2 font-mono text-sm text-muted">{product.part_number}</p>
          {product.notes ? <p className="mt-4 max-w-xl text-muted">{t(product.notes)}</p> : null}
          <h2 className="mt-10 font-semibold">{t({ de: "Gebotsverlauf", en: "Bid history" })}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(auction.bids ?? []).length === 0 ? (
              <li className="py-3 text-muted">{t({ de: "Noch keine Gebote.", en: "No bids yet." })}</li>
            ) : (
              (auction.bids ?? []).map((entry) => (
                <li key={entry.id} className="flex justify-between py-3">
                  <span>{entry.bidder_label}{entry.is_proxy ? " · auto" : ""}</span>
                  <span>{formatMoney(entry.amount, locale)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{auction.seller_name}</p>
            {live ? (
              <span className={`text-[11px] ${connected || !realtime ? "text-moss" : "text-muted"}`}>
                {realtime ? (connected ? "live ws" : "connecting…") : "poll 5s"}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted">{upcoming ? t({ de: "Startpreis", en: "Starting price" }) : t({ de: "Aktuelles Gebot", en: "Current bid" })}</p>
          <p className="text-3xl font-semibold">{formatMoney(auction.current_price, locale)}</p>
          <p className="mt-2 text-sm text-muted">{t({ de: "Mindestschritt", en: "Minimum increment" })} {formatMoney(auction.increment, locale)}</p>
          <p className="mt-1 text-sm text-muted">{auction.has_reserve ? t({ de: "Mindestpreis hinterlegt", en: "Reserve price set" }) : t({ de: "Kein Mindestpreis", en: "No reserve" })}</p>
          <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-sm">
            {upcoming
              ? t({ de: "Beginnt später automatisch.", en: "Starts automatically later." })
              : live
                ? `${t({ de: "Endet in etwa", en: "Ends in about" })} ${formatEndsIn(auction.ends_in_seconds, locale)}`
                : t({ de: "Beendet", en: "Ended" })}
          </p>

          {!loggedIn ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">{t({ de: "Zum Mitbieten anmelden und bewerben.", en: "Log in and apply to bid." })}</p>
              <Button className="w-full" variant="accent" onClick={() => { window.location.href = "/login"; }}>
                {t({ de: "Anmelden", en: "Log in" })}
              </Button>
              <Link href="/register" className="block text-center text-sm text-copper">{t({ de: "Konto anlegen", en: "Create account" })}</Link>
            </div>
          ) : null}

          {loggedIn && !appStatus ? (
            <Button className="mt-4 w-full" variant="accent" disabled={busy || auction.status === "ended" || auction.status === "cancelled"} onClick={() => void onApply()}>
              {t({ de: "Teilnahme beantragen", en: "Apply to participate" })}
            </Button>
          ) : null}

          {loggedIn && appStatus === "pending" ? (
            <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-sm">{t({ de: "Antrag wartet auf Freigabe.", en: "Application waiting for approval." })}</p>
          ) : null}

          {loggedIn && appStatus === "rejected" ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-copper">{t({ de: "Antrag abgelehnt.", en: "Application rejected." })}</p>
              <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void onApply()}>
                {t({ de: "Erneut beantragen", en: "Apply again" })}
              </Button>
            </div>
          ) : null}

          {loggedIn && approved && upcoming ? (
            <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-sm text-moss">{t({ de: "Freigegeben. Bieten möglich, sobald die Auktion startet.", en: "Approved. You can bid when the auction opens." })}</p>
          ) : null}

          {loggedIn && approved && live ? (
            <>
              <form className="mt-4 space-y-3" onSubmit={onBid}>
                <Field label={t({ de: "Gebot", en: "Bid" })}>
                  <input type="number" step="0.01" className={fieldClass} value={bid} onChange={(event) => setBid(Number(event.target.value))} />
                </Field>
                <Button type="submit" className="w-full" variant="accent" disabled={busy}>{t({ de: "Bieten", en: "Place bid" })}</Button>
              </form>
              <form className="mt-3 space-y-3" onSubmit={onProxy}>
                <Field label={t({ de: "Höchstgebot", en: "Maximum bid" })}>
                  <input type="number" step="0.01" className={fieldClass} value={max} onChange={(event) => setMax(Number(event.target.value))} />
                </Field>
                <Button type="submit" className="w-full" variant="secondary" disabled={busy}>{t({ de: "Automatisch bieten", en: "Set maximum bid" })}</Button>
              </form>
              <button type="button" className="mt-2 w-full text-sm text-muted" onClick={() => void cancelProxyRequest(auction.id).then(() => setNote(t({ de: "Automatik gestoppt.", en: "Auto-bid stopped." })))}>
                {t({ de: "Automatik stoppen", en: "Cancel automatic bidding" })}
              </button>
              {features.buyNow && auction.buy_now ? (
                <Button type="button" className="w-full mt-3" disabled={busy} onClick={() => void onBuyNow()}>
                  {t({ de: "Sofortkauf", en: "Buy now" })} {formatMoney(auction.buy_now, locale)}
                </Button>
              ) : null}
            </>
          ) : null}

          {isWinner && !auction.winner_order_id ? (
            <Button
              className="mt-4 w-full"
              variant="accent"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                void checkoutAuctionWin(auction.id, { shipping_name: authUser?.name, shipping_country: "DE" })
                  .then((response) => {
                    setNote(`${t({ de: "Auftrag", en: "Order" })} ${response.data.number}`);
                    return load();
                  })
                  .catch((err) => setError(err instanceof ApiError ? err.message : t({ de: "Checkout fehlgeschlagen.", en: "Checkout failed." })))
                  .finally(() => setBusy(false));
              }}
            >
              {t({ de: "Gewonnenes Los bezahlen", en: "Pay for won auction" })}
            </Button>
          ) : null}

          {isWinner && auction.winner_order_id ? (
            <Link href="/account/orders" className="mt-4 block text-center text-sm text-copper">
              {t({ de: "Auftrag ansehen", en: "View order" })}
            </Link>
          ) : null}

          <div className="mt-4 flex justify-between text-sm">
            <button type="button" onClick={() => toggleWatch(auction.slug)}>{watch.includes(auction.slug) ? t({ de: "Beobachtet", en: "Watching" }) : t({ de: "Merken", en: "Watch" })}</button>
            <Link href={`/store/${product.slug}`} className="text-copper">{t({ de: "Artikeldaten", en: "Item details" })}</Link>
          </div>
          {note ? <p className="mt-3 text-sm text-moss">{note}</p> : null}
          {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}
          <p className="mt-4 text-xs text-muted">{t({ de: "Gebote in den letzten zwei Minuten verlängern das Ende.", en: "Bids in the last two minutes extend the end." })}</p>
        </aside>
      </div>
    </Frame>
  );
}
