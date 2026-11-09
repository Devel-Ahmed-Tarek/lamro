"use client";

import Link from "next/link";
import { AuctionMarquee } from "@/components/auction-marquee";
import { ProductMarquee } from "@/components/product-marquee";
import { Frame } from "@/components/shell";
import { Badge, ButtonLink, Plate, TestingBadge } from "@/components/ui";
import { useEffect, useState } from "react";
import { usePublicCategories, usePublicProducts } from "@/hooks/use-public-catalog";
import { fetchAuctions, type ApiAuction } from "@/lib/auction-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { t, locale, features } = useStore();
  const { products } = usePublicProducts({ sort: "new" });
  const { categories } = usePublicCategories();
  const featured = products.slice(0, 4);
  const [liveAuctions, setLiveAuctions] = useState<ApiAuction[]>([]);

  useEffect(() => {
    fetchAuctions({ status: "live", per_page: 10 })
      .then((response) => setLiveAuctions(response.data.slice(0, 2)))
      .catch(() => setLiveAuctions([]));
  }, []);

  const spotlight = liveAuctions[0];
  const spotlightProduct = spotlight?.product;

  return (
    <Frame>
      <section>
        <div className="grid overflow-hidden rounded-3xl bg-ink text-white shadow-[0_28px_70px_-28px_rgba(255,77,0,0.55)] lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-8 p-6 sm:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-copper opacity-70" />
                  <span className="relative h-2 w-2 rounded-full bg-copper" />
                </span>
                {t({ de: "Live-Auktion", en: "Live auction" })}
              </p>
              <h1 className="mt-5 max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
                {t({ de: "Bieten Sie auf geprüfte Industrieelektronik.", en: "Bid on tested industrial electronics." })}
              </h1>
              <p className="mt-4 max-w-md text-base text-white/70 sm:text-lg">
                {t({ de: "Laufende Lose, klarer Zustand und ein Countdown bis zum Zuschlag.", en: "Live lots, a clear condition, and a countdown to the winning bid." })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {features.auctions ? <ButtonLink href="/auctions" variant="accent">{t({ de: "Jetzt bieten", en: "Bid now" })}</ButtonLink> : null}
              {features.store ? <ButtonLink href="/store" variant="secondary" className="border-white/15 bg-white text-ink">{t({ de: "Zum Shop", en: "Shop now" })}</ButtonLink> : null}
            </div>
          </div>
          <div className="relative min-h-72">
            <img src="/hero-auction.jpg" alt={t({ de: "Industrieelektronik auf dem Prüftisch", en: "Industrial electronics on the test bench" })} className="h-full min-h-72 w-full object-cover" />
            {spotlight && spotlightProduct ? (
              <Link href={`/auctions/${spotlight.slug}`} className="absolute right-4 bottom-4 left-4 rounded-2xl bg-white p-4 text-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] sm:right-auto sm:w-72">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-copper">{t({ de: "Aktuelles Gebot", en: "Current bid" })}</span>
                  <span className="text-muted">{Math.max(1, Math.round((spotlight.ends_in_seconds ?? 0) / 60))} min</span>
                </div>
                <p className="mt-2 font-semibold">{t(spotlightProduct.name)}</p>
                <p className="mt-1 text-2xl font-semibold">{formatMoney(spotlight.current_price, locale)}</p>
              </Link>
            ) : null}
          </div>
        </div>
        {features.auctions ? <AuctionMarquee /> : null}
      </section>

      {features.store ? <ProductMarquee /> : null}

      <section className="mt-16">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Partner", en: "Partner" })}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t({ de: "Partner-Auktionen — Coming soon", en: "Partner auctions — Coming soon" })}</h2>
          <p className="mt-2 text-sm text-muted">{t({ de: "Später können freigegebene Firmen eigene Lose einstellen. Heute verkauft und versteigert nur Jala.", en: "Later, approved companies will list their own lots. Today only Jala sells and auctions." })}</p>
        </div>
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
          {t({ de: "Externe Partner folgen in einer nächsten Phase.", en: "External partners follow in a later phase." })}
        </div>
      </section>

      <section className="mt-16">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Katalog", en: "Catalog" })}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t({ de: "Kategorien", en: "Categories" })}</h2>
          <p className="mt-2 text-sm text-muted">{t({ de: "Vom Umrichter bis zum Ersatzteil.", en: "From drives to spare parts." })}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          {categories[0] ? (
            <Link href={`/store?category=${categories[0].slug}`} className="group flex min-h-72 flex-col justify-between rounded-3xl bg-ink p-8 text-white shadow-[0_24px_50px_-28px_rgba(18,18,18,0.8)] transition hover:-translate-y-0.5">
              <span className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">01</span>
              <span>
                <span className="block text-4xl font-semibold tracking-tight">{t(categories[0].name)}</span>
                <span className="mt-3 flex items-center justify-between text-sm text-white/65">
                  <span>{categories[0].count ?? 0} {t({ de: "Artikel", en: "items" })}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink transition group-hover:bg-copper group-hover:text-white">→</span>
                </span>
              </span>
            </Link>
          ) : null}
          <div className="flex flex-col gap-3">
            {categories.slice(1).map((category, index) => (
              <Link key={category.slug} href={`/store?category=${category.slug}`} className="group flex flex-1 items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4 transition hover:-translate-y-px hover:border-copper/40 hover:shadow-[0_12px_24px_-16px_rgba(255,77,0,0.45)]">
                <span className="w-8 text-xs font-semibold tracking-[0.14em] text-copper">0{index + 2}</span>
                <span className="min-w-0 flex-1 font-medium">{t(category.name)}</span>
                <span className="text-sm text-muted">{category.count ?? 0}</span>
                <span className="text-muted transition group-hover:text-copper">→</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link href="/categories" className="text-sm font-medium text-copper">{t({ de: "Alle Kategorien", en: "All categories" })}</Link>
        </div>
      </section>

      {features.store ? (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-semibold">{t({ de: "Aus dem Lager", en: "From stock" })}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <Link key={product.slug} href={`/store/${product.slug}`} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Plate brand={product.manufacturer} part={product.partNumber} />
                <div className="p-4">
                  <p className="text-sm text-muted">{product.manufacturer}</p>
                  <p className="mt-1 font-medium">{t(product.name)}</p>
                  <p className="mt-3 font-medium">{formatMoney(product.price, locale)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {features.auctions ? (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">{t({ de: "Laufende Auktionen", en: "Live auctions" })}</h2>
            <Link href="/auctions" className="text-sm text-copper">{t({ de: "Alle Auktionen", en: "All auctions" })}</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {liveAuctions.map((auction) => {
              const product = auction.product;
              if (!product) return null;
              return (
                <Link key={auction.slug} href={`/auctions/${auction.slug}`} className="grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-[180px_1fr]">
                  <Plate brand={product.manufacturer ?? "Jala"} part={product.part_number ?? ""} />
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {product.testing ? <TestingBadge value={product.testing as "tested"} /> : null}
                      <Badge tone="accent">{auction.type}</Badge>
                    </div>
                    <p className="mt-3 font-medium">{t(product.name)}</p>
                    <p className="mt-1 text-sm text-muted">{auction.seller_name}</p>
                    <p className="mt-4 text-lg font-semibold">{formatMoney(auction.current_price, locale)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-14 grid gap-6 rounded-3xl bg-ink px-6 py-10 text-white md:grid-cols-[1.4fr_0.6fr] md:items-center">
        <div>
          <h2 className="text-3xl font-semibold">{t({ de: "Sie suchen eine bestimmte Teilenummer?", en: "Looking for a specific part number?" })}</h2>
          <p className="mt-3 max-w-xl text-white/75">{t({ de: "Fragen Sie direkt am Artikel. Die Nachricht bleibt mit Teilenummer und Bild verknüpft.", en: "Ask from the product page. The message stays tied to the part number and photo." })}</p>
        </div>
        <ButtonLink href="/contact" variant="secondary" className="justify-self-start bg-white">{t({ de: "Kontakt", en: "Contact" })}</ButtonLink>
      </section>
    </Frame>
  );
}
