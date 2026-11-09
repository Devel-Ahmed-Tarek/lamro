"use client";

import Link from "next/link";
import { Frame } from "@/components/shell";
import { PageIntro } from "@/components/ui";
import { usePublicCategories } from "@/hooks/use-public-catalog";
import { useStore } from "@/lib/store";

export default function CategoriesPage() {
  const { t } = useStore();
  const { categories, loading } = usePublicCategories();

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Sortiment", en: "Range" })} title={t({ de: "Kategorien", en: "Categories" })} lede={t({ de: "Einstieg nach Maschinenfunktion, nicht nach Marketingnamen.", en: "Browse by machine function, not by marketing name." })} />
      {loading ? <p className="mt-8 text-sm text-muted">Loading…</p> : null}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.slug} href={`/store?category=${category.slug}`} className="rounded-2xl border border-line bg-white p-6 hover:border-ink">
            <h2 className="text-xl font-semibold">{t(category.name)}</h2>
            <p className="mt-2 text-sm text-muted">{category.count ?? 0} {t({ de: "Artikel im Shop", en: "items in the store" })}</p>
          </Link>
        ))}
      </div>
    </Frame>
  );
}
