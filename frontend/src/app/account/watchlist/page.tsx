"use client";

import Link from "next/link";
import { Desk, useCustomerNav } from "@/components/desk";
import { productBySlug } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function WatchPage() {
  const { t, watch, toggleWatch } = useStore();
  const items = watch.map((slug) => productBySlug(slug)).filter(Boolean);
  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Merkliste", en: "Watchlist" })}</h1>
      <ul className="mt-6 space-y-3">
        {items.length === 0 ? <li className="text-muted">{t({ de: "Noch nichts gemerkt.", en: "Nothing saved yet." })}</li> : items.map((product) => (
          <li key={product!.slug} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
            <Link href={`/store/${product!.slug}`}>{t(product!.name)}</Link>
            <button type="button" className="text-sm text-muted" onClick={() => toggleWatch(product!.slug)}>{t({ de: "Entfernen", en: "Remove" })}</button>
          </li>
        ))}
      </ul>
    </Desk>
  );
}
