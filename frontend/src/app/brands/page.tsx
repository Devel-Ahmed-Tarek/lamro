"use client";

import Link from "next/link";
import { Frame } from "@/components/shell";
import { PageIntro } from "@/components/ui";
import { usePublicBrands } from "@/hooks/use-public-catalog";
import { useStore } from "@/lib/store";

export default function BrandsPage() {
  const { t } = useStore();
  const { brands, loading } = usePublicBrands();

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Hersteller", en: "Manufacturers" })} title={t({ de: "Marken im Handel.", en: "Brands we handle." })} />
      {loading ? <p className="mt-8 text-sm text-muted">Loading…</p> : null}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link key={brand.slug} href={`/store?brand=${encodeURIComponent(brand.name)}`} className="flex min-h-32 items-end rounded-2xl bg-ink p-5 text-paper">
            <span className="text-2xl font-semibold">{brand.name}</span>
          </Link>
        ))}
      </div>
    </Frame>
  );
}
