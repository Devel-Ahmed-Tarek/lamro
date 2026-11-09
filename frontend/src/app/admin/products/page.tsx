"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchAdminProducts,
  publishProductRequest,
  unpublishProductRequest,
  type ApiProduct,
} from "@/lib/catalog-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function AdminProducts() {
  const { t, locale } = useStore();
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminProducts({ per_page: 100 });
      setItems(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublish(product: ApiProduct) {
    setBusyId(product.id);
    setError("");
    try {
      const response =
        product.status === "published"
          ? await unpublishProductRequest(product.id)
          : await publishProductRequest(product.id);
      setItems((current) => current.map((item) => (item.id === product.id ? response.data : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktion fehlgeschlagen.", en: "Action failed." }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.products">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Artikel", en: "Products" })}</h1>
          <ButtonLink href="/admin/products/new">{t({ de: "Artikel anlegen", en: "Create product" })}</ButtonLink>
        </div>

        {error ? <p className="mt-4 text-sm text-copper">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}

        <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white text-sm">
          {items.map((product) => (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{t(product.name)}</p>
                <p className="font-mono text-xs text-muted">
                  {product.part_number || "—"} · {product.sku || "no SKU"} · {product.status}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatMoney(product.price, locale)} · {product.available_stock}/{product.total_stock}{" "}
                  {t({ de: "verfügbar", en: "available" })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/products/${product.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-ink">
                  {t({ de: "Bearbeiten", en: "Edit" })}
                </Link>
                <Button
                  size="sm"
                  variant={product.status === "published" ? "secondary" : "accent"}
                  disabled={busyId === product.id}
                  onClick={() => void togglePublish(product)}
                >
                  {product.status === "published"
                    ? t({ de: "Unpublish", en: "Unpublish" })
                    : t({ de: "Publish", en: "Publish" })}
                </Button>
              </div>
            </li>
          ))}
          {!loading && items.length === 0 ? (
            <li className="px-4 py-8 text-muted">{t({ de: "Keine Artikel.", en: "No products." })}</li>
          ) : null}
        </ul>
      </AdminGate>
    </AdminShell>
  );
}
