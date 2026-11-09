"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchAuctions, formatEndsIn, type ApiAuction } from "@/lib/auction-api";
import { formatMoney, type Locale } from "@/lib/catalog";
import { useStore } from "@/lib/store";

function fillLoop(items: ApiAuction[]) {
  if (items.length === 0) return [];
  const loop = [...items];
  while (loop.length < 8) loop.push(...items);
  return loop;
}

function Card({ auction, locale, label }: { auction: ApiAuction; locale: Locale; label: string }) {
  const { t } = useStore();
  const product = auction.product;
  if (!product) return null;

  return (
    <Link href={`/auctions/${auction.slug}`} className="flex w-72 shrink-0 items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_16px_40px_-24px_rgba(18,18,18,0.55)]">
      <img src="/hero-auction.jpg" alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-copper">{label} · {formatEndsIn(auction.ends_in_seconds, locale)}</span>
        <span className="mt-1 block truncate font-medium">{t(product.name)}</span>
        <span className="mt-1 block font-semibold">{formatMoney(auction.current_price, locale)}</span>
      </span>
    </Link>
  );
}

export function AuctionMarquee() {
  const { t, locale } = useStore();
  const [auctions, setAuctions] = useState<ApiAuction[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const loop = fillLoop(auctions.filter((item) => item.status === "live" || item.status === "scheduled"));
  const track = [...loop, ...loop];

  useEffect(() => {
    fetchAuctions({ per_page: 20 })
      .then((response) => setAuctions(response.data))
      .catch(() => setAuctions([]));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let offset = 0;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const half = el.scrollWidth / 2;
      const delta = now - last;
      last = now;
      if (half > 0 && !paused.current) {
        offset = (offset + delta * 0.05) % half;
        el.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop.length]);

  if (loop.length === 0) return null;

  return (
    <section className="mt-8 overflow-hidden" onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
      <div ref={trackRef} className="flex w-max gap-3 will-change-transform">
        {track.map((auction, index) => (
          <Card
            key={`${auction.slug}-${index}`}
            auction={auction}
            locale={locale}
            label={auction.status === "live" ? t({ de: "Live", en: "Live" }) : t({ de: "Bald", en: "Soon" })}
          />
        ))}
      </div>
    </section>
  );
}
