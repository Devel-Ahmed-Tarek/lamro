"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
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
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ApiBrand | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createBrandRequest({ name });
      setName("");
      setNotice(t({ de: "Hersteller angelegt.", en: "Brand created." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      await updateBrandRequest(editing.id, { name: editing.name, is_active: editing.is_active });
      setEditing(null);
      setNotice(t({ de: "Hersteller gespeichert.", en: "Brand saved." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktualisierung fehlgeschlagen.", en: "Update failed." }));
    }
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.brands">
        <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Hersteller", en: "Brands" })}</h1>
        {notice ? <p className="mt-3 text-sm text-moss">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

        <form onSubmit={create} className="mt-6 flex max-w-xl flex-wrap items-end gap-3 rounded-3xl border border-line bg-white p-5">
          <div className="min-w-56 flex-1">
            <Field label={t({ de: "Name", en: "Name" })}>
              <input required className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button type="submit">{t({ de: "Anlegen", en: "Create" })}</Button>
        </form>

        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-6">
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            defaultSortId="name"
            getSearchText={(row) => `${row.name} ${row.slug}`}
            onEdit={(row) => setEditing({ ...row })}
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
                getValue: (row) => row.name,
                cell: (row) => <span className="font-medium">{row.name}</span>,
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
                getValue: (row) => (row.is_active ? "aktiv" : "ausgeblendet"),
                cell: (row) => (row.is_active ? t({ de: "aktiv", en: "active" }) : t({ de: "ausgeblendet", en: "hidden" })),
              },
              {
                id: "created_at",
                header: { de: "Erstellt", en: "Created" },
                sort: "date",
                getValue: (row) => row.created_at,
                cell: (row) => (row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—"),
              },
            ]}
          />
        </div>

        {editing ? (
          <form onSubmit={saveEdit} className="mt-6 max-w-xl space-y-3 rounded-3xl border border-line bg-white p-5">
            <h2 className="font-semibold">{t({ de: "Bearbeiten", en: "Edit" })}</h2>
            <Field label={t({ de: "Name", en: "Name" })}>
              <input className={fieldClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              {t({ de: "Aktiv", en: "Active" })}
            </label>
            <div className="flex gap-2">
              <Button type="submit">{t({ de: "Speichern", en: "Save" })}</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t({ de: "Abbrechen", en: "Cancel" })}</Button>
            </div>
          </form>
        ) : null}
      </AdminGate>
    </AdminShell>
  );
}
