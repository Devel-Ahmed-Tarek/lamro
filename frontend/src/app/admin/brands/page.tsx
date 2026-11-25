"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { TaxonomyForm } from "@/components/taxonomy-form";
import { ApiError } from "@/lib/api";
import {
  bulkDeleteBrandsRequest,
  createBrandRequest,
  fetchAdminBrands,
  hideBrandRequest,
  updateBrandRequest,
  type ApiBrand,
} from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

export default function AdminBrandsPage() {
  const { t, locale } = useStore();
  const [items, setItems] = useState<ApiBrand[]>([]);
  const [editing, setEditing] = useState<ApiBrand | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminBrands();
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
      <AdminGate permission="admin.brands">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Hersteller", en: "Brands" })}</h1>
            <p className="mt-2 text-sm text-muted">
              {t({
                de: "Name, Beschreibung und SEO in einer Sprache — Rest automatisch.",
                en: "Name, description and SEO in one language — the rest automatically.",
              })}
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-ink px-4 py-2 text-sm text-white"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            {t({ de: "Anlegen", en: "Create" })}
          </button>
        </div>
        {notice ? <p className="mt-3 text-sm text-moss">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

        {creating || editing ? (
          <div className="mt-6 max-w-3xl">
            <TaxonomyForm
              key={editing?.id ?? "new"}
              mode={editing ? "edit" : "create"}
              busy={busy}
              initial={
                editing
                  ? {
                      name: editing.name,
                      description: editing.description,
                      seo_title: editing.seo_title,
                      seo_description: editing.seo_description,
                      seo_keywords: editing.seo_keywords,
                      slug: editing.slug,
                      is_active: editing.is_active,
                    }
                  : undefined
              }
              onCancel={() => {
                setCreating(false);
                setEditing(null);
              }}
              onSubmit={async (value) => {
                setBusy(true);
                setError("");
                try {
                  const payload = {
                    name: value.name,
                    description: value.description,
                    seo_title: value.seo_title,
                    seo_description: value.seo_description,
                    seo_keywords: value.seo_keywords,
                    slug: value.slug || undefined,
                    is_active: value.is_active,
                    auto_translate: value.auto_translate,
                    source_locale: value.source_locale,
                  };
                  if (editing) {
                    await updateBrandRequest(editing.id, payload);
                    setNotice(t({ de: "Hersteller gespeichert.", en: "Brand saved." }));
                  } else {
                    await createBrandRequest(payload);
                    setNotice(t({ de: "Hersteller angelegt.", en: "Brand created." }));
                  }
                  setCreating(false);
                  setEditing(null);
                  await load();
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-6">
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            defaultSortId="name"
            getSearchText={(row) => `${t(row.name)} ${row.slug}`}
            onEdit={(row) => {
              setCreating(false);
              setEditing({ ...row, name: { ...row.name } });
            }}
            onDelete={async (row) => {
              await hideBrandRequest(row.id);
              setNotice(t({ de: "Hersteller ausgeblendet.", en: "Brand hidden." }));
              await load();
            }}
            onBulkDelete={async (rows) => {
              await bulkDeleteBrandsRequest(rows.map((row) => row.id));
              setNotice(t({ de: "Auswahl ausgeblendet.", en: "Selection hidden." }));
              await load();
            }}
            columns={[
              {
                id: "name",
                header: { de: "Name", en: "Name" },
                sort: "alpha",
                getValue: (row) => t(row.name),
                cell: (row) => (
                  <span className="font-medium">
                    {t(row.name)}{" "}
                    <Link href={`/brands/${row.slug}`} className="text-xs text-copper">
                      ↗
                    </Link>
                  </span>
                ),
              },
              {
                id: "slug",
                header: "Slug",
                sort: "alpha",
                getValue: (row) => row.slug,
                cell: (row) => <span className="font-mono text-xs">{row.slug}</span>,
              },
              {
                id: "count",
                header: { de: "Artikel", en: "Items" },
                sort: "number",
                getValue: (row) => row.count ?? 0,
                cell: (row) => row.count ?? 0,
              },
              {
                id: "status",
                header: { de: "Status", en: "Status" },
                sort: "alpha",
                getValue: (row) => (row.is_active ? "active" : "hidden"),
                cell: (row) => (row.is_active ? t({ de: "aktiv", en: "active" }) : t({ de: "ausgeblendet", en: "hidden" })),
              },
              {
                id: "created_at",
                header: { de: "Erstellt", en: "Created" },
                sort: "date",
                getValue: (row) => row.created_at,
                cell: (row) =>
                  row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : locale === "ar" ? "ar" : "en-GB") : "—",
              },
            ]}
          />
        </div>
      </AdminGate>
    </AdminShell>
  );
}
