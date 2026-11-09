"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Notice, PageIntro, Plate, SelectMenu } from "@/components/ui";
import { fetchAuctions, formatEndsIn, type ApiAuction } from "@/lib/auction-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function AuctionsPage() {
  const { t, locale, features } = useStore();
  const [status, setStatus] = useState<"all" | "live" | "scheduled" | "ended">("all");
  const [items, setItems] = useState<ApiAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAuctions({ status: status === "all" ? undefined : status, per_page: 100 })
      .then((response) => {
        if (alive) setItems(response.data);
      })
      .catch(() => {
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status]);

  if (!features.auctions) return <Frame><Notice>{t({ de: "Neue Auktionen sind ausgeschaltet.", en: "Auctions are switched off." })}</Notice></Frame>;

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Auktionen", en: "Auctions" })} title={t({ de: "Bieten auf geprüfte Lose.", en: "Bid on tested lots." })} lede={t({ de: "Jala-Lose. Bitte um Teilnahme bewerben — Freigabe durch die Verwaltung.", en: "Jala lots. Apply to participate — admin approval required." })} />
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
        <SelectMenu className="lg:w-48" value={status} onChange={setStatus} options={[
          { value: "all", label: t({ de: "Alle Status", en: "Any status" }) },
          { value: "live", label: t({ de: "Läuft", en: "Live" }) },
          { value: "scheduled", label: t({ de: "Geplant", en: "Upcoming" }) },
          { value: "ended", label: t({ de: "Beendet", en: "Ended" }) },
        ]} />
      </div>
      {loading ? <p className="mt-8 text-sm text-muted">Loading…</p> : null}
      <div className="mt-8 grid gap-4">
        {items.map((auction) => {
          const product = auction.product;
          if (!product) return null;
          return (
            <Link key={auction.slug} href={`/auctions/${auction.slug}`} className="grid overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[220px_1fr_180px]">
              <Plate brand={product.manufacturer ?? "Jala"} part={product.part_number ?? ""} />
              <div className="p-5">
                <p className="text-xs tracking-[0.14em] text-copper uppercase">{auction.type} · {auction.status}</p>
                <h2 className="mt-2 text-xl font-semibold">{t(product.name)}</h2>
                <p className="mt-1 font-mono text-xs text-muted">{product.part_number}</p>
                <p className="mt-3 text-sm text-muted">{auction.seller_name} · {formatEndsIn(auction.ends_in_seconds, locale)}</p>
              </div>
              <div className="flex flex-col justify-center border-t border-line p-5 md:border-t-0 md:border-l">
                <p className="text-xs text-muted">{t({ de: "Aktuelles Gebot", en: "Current bid" })}</p>
                <p className="text-2xl font-semibold">{formatMoney(auction.current_price, locale)}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {!loading && items.length === 0 ? <p className="mt-8 text-muted">{t({ de: "Keine Auktionen.", en: "No auctions." })}</p> : null}
    </Frame>
  );
}
