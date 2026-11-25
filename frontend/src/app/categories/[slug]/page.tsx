"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { ButtonLink, Notice, PageIntro, Plate } from "@/components/ui";
import { usePublicProducts } from "@/hooks/use-public-catalog";
import { fetchCategory, type ApiCategory } from "@/lib/catalog-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useStore();
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [error, setError] = useState("");
  const { products, loading } = usePublicProducts({ category: slug, sort: "new" });

  useEffect(() => {
    fetchCategory(slug)
      .then((response) => setCategory(response.data))
      .catch(() => setError(t({ de: "Kategorie nicht gefunden.", en: "Category not found." })));
  }, [slug, t]);

  useEffect(() => {
    if (!category) return;
    const title = t(category.seo_title ?? {}) || t(category.name);
    const description = t(category.seo_description ?? {}) || t(category.description ?? {});
    const keywords = t(category.seo_keywords ?? {});
    document.title = title ? `${title} · Jala` : "Jala";
    const ensureMeta = (name: string, content: string) => {
      if (!content) return;
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    ensureMeta("description", description);
    ensureMeta("keywords", keywords);
  }, [category, t]);

  return (
    <Frame>
      {error ? (
        <div className="mt-8">
          <Notice>{error}</Notice>
          <ButtonLink href="/categories" className="mt-4">
            {t({ de: "Alle Kategorien", en: "All categories" })}
          </ButtonLink>
        </div>
      ) : category ? (
        <>
          <PageIntro
            kicker={t({ de: "Kategorien", en: "Categories" })}
            title={t(category.name)}
            lede={t(category.description ?? {}) || undefined}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/store?category=${encodeURIComponent(category.slug)}`}>
              {t({ de: "Im Shop anzeigen", en: "View in store" })}
            </ButtonLink>
            <ButtonLink href="/categories" variant="secondary">
              {t({ de: "Alle Kategorien", en: "All categories" })}
            </ButtonLink>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">
              {t({ de: "Artikel in", en: "Products in" })} {t(category.name)}
            </h2>
            {loading ? <p className="mt-4 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}
            {!loading && products.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t({ de: "Keine Artikel in dieser Kategorie.", en: "No products in this category." })}</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/store/${product.slug}`}
                    className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Plate brand={product.manufacturer} part={product.partNumber} />
                    <div className="p-4">
                      <p className="font-medium">{t(product.name)}</p>
                      <p className="mt-3 font-medium">{formatMoney(product.price, locale)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p>
      )}
    </Frame>
  );
}
