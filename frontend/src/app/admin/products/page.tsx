"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  bulkDeleteProductsRequest,
  deleteProductRequest,
  fetchAdminProducts,
  publishProductRequest,
  unpublishProductRequest,
  type ApiProduct,
} from "@/lib/catalog-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function AdminProducts() {
  const { t, locale } = useStore();
  const router = useRouter();
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  return (
    <AdminShell>
      <AdminGate permission="admin.products">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Artikel", en: "Products" })}</h1>
          <ButtonLink href="/admin/products/new">{t({ de: "Artikel anlegen", en: "Create product" })}</ButtonLink>
        </div>
        {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-6">
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            defaultSortId="name"
            getSearchText={(row) => `${t(row.name)} ${row.part_number ?? ""} ${row.sku ?? ""} ${row.status}`}
            onEdit={(row) => router.push(`/admin/products/${row.id}`)}
            onDelete={async (row) => {
              await deleteProductRequest(row.id);
              setNotice(t({ de: "Artikel archiviert.", en: "Product archived." }));
              await load();
            }}
            onBulkDelete={async (rows) => {
              await bulkDeleteProductsRequest(rows.map((row) => row.id));
              setNotice(t({ de: "Auswahl archiviert.", en: "Selection archived." }));
              await load();
            }}
            deleteLabel={{ de: "Archivieren?", en: "Archive?" }}
            bulkDeleteLabel={{ de: "Auswahl archivieren", en: "Archive selected" }}
            columns={[
              {
                id: "name",
                header: { de: "Name", en: "Name" },
                sort: "alpha",
                getValue: (row) => t(row.name),
                cell: (row) => (
                  <div>
                    <p className="font-medium">{t(row.name)}</p>
                    <p className="font-mono text-xs text-muted">
                      {row.part_number || "—"} · {row.sku || t({ de: "ohne SKU", en: "no SKU" })}
                    </p>
                  </div>
                ),
              },
              {
                id: "status",
                header: { de: "Status", en: "Status" },
                sort: "alpha",
                getValue: (row) => row.status,
                cell: (row) => row.status,
              },
              {
                id: "price",
                header: { de: "Preis", en: "Price" },
                sort: "number",
                getValue: (row) => row.price,
                cell: (row) => formatMoney(row.price, locale),
              },
              {
                id: "stock",
                header: { de: "Lager", en: "Stock" },
                sort: "number",
                getValue: (row) => row.available_stock,
                cell: (row) => `${row.available_stock}/${row.total_stock}`,
              },
              {
                id: "created_at",
                header: { de: "Erstellt", en: "Created" },
                sort: "date",
                getValue: (row) => row.created_at,
                cell: (row) => (row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—"),
              },
            ]}
            extraActions={(row) => (
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink"
                onClick={() =>
                  void (row.status === "published" ? unpublishProductRequest(row.id) : publishProductRequest(row.id))
                    .then(load)
                    .catch((err) => setError(err instanceof ApiError ? err.message : t({ de: "Aktion fehlgeschlagen.", en: "Action failed." })))
                }
              >
                {row.status === "published"
                  ? t({ de: "Zurückziehen", en: "Unpublish" })
                  : t({ de: "Veröffentlichen", en: "Publish" })}
              </button>
            )}
          />
        </div>
      </AdminGate>
    </AdminShell>
  );
}
