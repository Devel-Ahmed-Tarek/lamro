"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Frame } from "@/components/shell";
import { ButtonLink, ConditionBadge, Notice, PageIntro, Plate, SelectMenu } from "@/components/ui";
import { formatMoney, type Condition } from "@/lib/catalog";
import { usePublicBrands, usePublicCategories, usePublicProducts } from "@/hooks/use-public-catalog";
import { useStore } from "@/lib/store";

function StoreView() {
  const params = useSearchParams();
  const router = useRouter();
  const { t, locale, features } = useStore();
  const [condition, setCondition] = useState<Condition | "">("");
  const [sort, setSort] = useState("new");
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";

  const { categories } = usePublicCategories();
  const { brands } = usePublicBrands();
  const { products: list, loading } = usePublicProducts({
    q: query,
    category,
    brand,
    condition: condition || undefined,
    sort,
  });

  if (!features.store) {
    return <Frame><Notice>{t({ de: "Der Shop ist in der Verwaltung ausgeschaltet.", en: "The store is switched off in admin." })}</Notice></Frame>;
  }

  return (
    <Frame>
      <PageIntro kicker="Shop" title={t({ de: "Lagerware mit festem Preis.", en: "Stock with a fixed price." })} lede={t({ de: "Nur Artikel von Jala. Auktionen fremder Firmen erscheinen hier nicht.", en: "Jala items only. Other companies’ auctions do not appear here." })} />
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <SelectMenu className="lg:w-52" value={category} onChange={(value) => router.push(value ? `/store?category=${value}` : "/store")} options={[{ value: "", label: t({ de: "Alle Kategorien", en: "All categories" }) }, ...categories.map((item) => ({ value: item.slug, label: t(item.name) }))]} />
        <SelectMenu className="lg:w-52" value={brand} onChange={(value) => router.push(value ? `/store?brand=${encodeURIComponent(value)}` : "/store")} options={[{ value: "", label: t({ de: "Alle Hersteller", en: "All brands" }) }, ...brands.map((item) => ({ value: item.name, label: item.name }))]} />
        <SelectMenu<Condition | ""> className="lg:w-48" value={condition} onChange={setCondition} options={[
          { value: "", label: t({ de: "Jeder Zustand", en: "Any condition" }) },
          { value: "new", label: t({ de: "Neu", en: "New" }) },
          { value: "used", label: t({ de: "Gebraucht", en: "Used" }) },
          { value: "refurbished", label: t({ de: "Generalüberholt", en: "Refurbished" }) },
          { value: "parts", label: t({ de: "Für Teile", en: "For parts" }) },
        ]} />
        <SelectMenu className="lg:w-40" value={sort} onChange={setSort} options={[
          { value: "new", label: t({ de: "Neueste", en: "Newest" }) },
          { value: "price", label: t({ de: "Preis", en: "Price" }) },
          { value: "name", label: t({ de: "Name", en: "Name" }) },
        ]} />
        {(query || category || brand || condition) ? <ButtonLink href="/store" variant="ghost" className="justify-self-start">{t({ de: "Filter löschen", en: "Clear filters" })}</ButtonLink> : null}
      </div>
      {loading ? <p className="mt-8 text-sm text-muted">Loading…</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((product) => (
          <Link key={product.slug} href={`/store/${product.slug}`} className="overflow-hidden rounded-2xl border border-line bg-white">
            <Plate brand={product.manufacturer} part={product.partNumber} />
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2"><ConditionBadge value={product.condition} /></div>
              <div>
                <p className="font-mono text-xs text-muted">{product.partNumber}</p>
                <p className="mt-1 font-medium">{t(product.name)}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{formatMoney(product.price, locale)}</span>
                <span className="text-muted">{product.stock} {t({ de: "verfügbar", en: "available" })}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!loading && list.length === 0 ? <p className="mt-8 text-muted">{t({ de: "Keine Artikel für diese Suche.", en: "No items match this search." })}</p> : null}
    </Frame>
  );
}

export default function StorePage() {
  return <Suspense><StoreView /></Suspense>;
}
