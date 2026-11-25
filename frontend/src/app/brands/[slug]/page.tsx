"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { ButtonLink, Notice, PageIntro, Plate } from "@/components/ui";
import { usePublicProducts } from "@/hooks/use-public-catalog";
import { fetchBrand, type ApiBrand } from "@/lib/catalog-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function BrandDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useStore();
  const [brand, setBrand] = useState<ApiBrand | null>(null);
  const [error, setError] = useState("");
  const { products, loading } = usePublicProducts({ brand: slug, sort: "new" });

  useEffect(() => {
    fetchBrand(slug)
      .then((response) => setBrand(response.data))
      .catch(() => setError(t({ de: "Hersteller nicht gefunden.", en: "Brand not found." })));
  }, [slug, t]);

  useEffect(() => {
    if (!brand) return;
    const title = t(brand.seo_title ?? {}) || t(brand.name);
    const description = t(brand.seo_description ?? {}) || t(brand.description ?? {});
    const keywords = t(brand.seo_keywords ?? {});
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
  }, [brand, t]);

  return (
    <Frame>
      {error ? (
        <div className="mt-8">
          <Notice>{error}</Notice>
          <ButtonLink href="/brands" className="mt-4">
            {t({ de: "Alle Hersteller", en: "All brands" })}
          </ButtonLink>
        </div>
      ) : brand ? (
        <>
          <PageIntro
            kicker={t({ de: "Hersteller", en: "Manufacturers" })}
            title={t(brand.name)}
            lede={t(brand.description ?? {}) || undefined}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/store?brand=${encodeURIComponent(brand.slug)}`}>
              {t({ de: "Im Shop anzeigen", en: "View in store" })}
            </ButtonLink>
            <ButtonLink href="/brands" variant="secondary">
              {t({ de: "Alle Hersteller", en: "All brands" })}
            </ButtonLink>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">
              {t({ de: "Artikel von", en: "Products from" })} {t(brand.name)}
            </h2>
            {loading ? <p className="mt-4 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}
            {!loading && products.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t({ de: "Keine Artikel für diesen Hersteller.", en: "No products for this brand." })}</p>
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
