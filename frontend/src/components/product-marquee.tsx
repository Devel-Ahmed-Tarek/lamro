"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { usePublicProducts } from "@/hooks/use-public-catalog";
import { formatMoney, type Locale, type Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";

function fillLoop(items: Product[]) {
  if (items.length === 0) return [];
  const loop = [...items];
  while (loop.length < 8) loop.push(...items);
  return loop;
}

function Card({ product, locale }: { product: Product; locale: Locale }) {
  const { t, addToCart, features } = useStore();

  return (
    <article className="flex w-64 shrink-0 flex-col rounded-2xl border border-line bg-white p-3 shadow-[0_16px_40px_-24px_rgba(18,18,18,0.55)]">
      <Link href={`/store/${product.slug}`}>
        <img src="/hero-auction.jpg" alt="" className="h-40 w-full rounded-xl object-cover" />
      </Link>
      <Link href={`/store/${product.slug}`} className="mt-3 line-clamp-2 min-h-10 font-medium leading-5 hover:text-copper">{t(product.name)}</Link>
      <p className="mt-1 truncate text-xs text-muted">{product.manufacturer} · {product.partNumber}</p>
      <p className="mt-3 text-lg font-semibold">{formatMoney(product.price, locale)}</p>
      <div className={features.makeOffer ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 grid gap-2"}>
        <Button size="sm" variant="accent" onClick={() => addToCart(product.slug)}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M4 5h1.2l1.2 8h8.2l1.4-5.5H7" /><circle cx="8.2" cy="16" r="1" /><circle cx="14" cy="16" r="1" /></svg>
          {t({ de: "Korb", en: "Cart" })}
        </Button>
        {features.makeOffer ? (
          <ButtonLink href={`/store/${product.slug}?offer=1`} size="sm" variant="secondary">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M11.2 3.8h4.2v4.2L8.6 15 5 11.4l6.2-7.6Z" /><circle cx="13.6" cy="6.4" r=".8" fill="currentColor" stroke="none" /></svg>
            {t({ de: "Angebot", en: "Offer" })}
          </ButtonLink>
        ) : null}
      </div>
    </article>
  );
}

export function ProductMarquee() {
  const { t, locale } = useStore();
  const { products, loading } = usePublicProducts({ sort: "new" });
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const loop = fillLoop(products);
  const track = [...loop, ...loop];

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
        offset = (offset + delta * 0.06) % half;
        el.style.transform = `translate3d(${-(half - offset)}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop.length]);

  if (loading && loop.length === 0) return null;
  if (loop.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mx-auto mb-6 max-w-xl text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Shop", en: "Shop" })}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t({ de: "Ausgewählte Produkte", en: "Featured products" })}</h2>
        <p className="mt-2 text-sm text-muted">{t({ de: "Geprüfte Artikel aus dem Lager, mit Preis, Zustand und direkter Anfrage.", en: "Tested stock, with price, condition, and a direct offer." })}</p>
        <Link href="/store" className="mt-3 inline-block text-sm font-medium text-copper">{t({ de: "Alle Artikel", en: "All products" })}</Link>
      </div>
      <div className="overflow-hidden" onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
        <div ref={trackRef} className="flex w-max gap-3 will-change-transform">
          {track.map((product, index) => (
            <Card key={`${product.slug}-${index}`} product={product} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
