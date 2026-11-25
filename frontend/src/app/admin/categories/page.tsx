"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  bulkDeleteCategoriesRequest,
  createCategoryRequest,
  fetchAdminCategories,
  hideCategoryRequest,
  updateCategoryRequest,
  type ApiCategory,
} from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

export default function AdminCategoriesPage() {
  const { t, locale } = useStore();
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [nameDe, setNameDe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminCategories();
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
      await createCategoryRequest({ name: { de: nameDe, en: nameEn } });
      setNameDe("");
      setNameEn("");
      setNotice(t({ de: "Kategorie angelegt.", en: "Category created." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      await updateCategoryRequest(editing.id, { name: editing.name, is_active: editing.is_active });
      setEditing(null);
      setNotice(t({ de: "Kategorie gespeichert.", en: "Category saved." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktualisierung fehlgeschlagen.", en: "Update failed." }));
    }
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.categories">
        <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Kategorien", en: "Categories" })}</h1>
        {notice ? <p className="mt-3 text-sm text-moss">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

        <form onSubmit={create} className="mt-6 grid max-w-xl gap-3 rounded-3xl border border-line bg-white p-5 sm:grid-cols-2">
          <Field label={t({ de: "Name (DE)", en: "Name DE" })}>
            <input required className={fieldClass} value={nameDe} onChange={(e) => setNameDe(e.target.value)} />
          </Field>
          <Field label={t({ de: "Name (EN)", en: "Name EN" })}>
            <input required className={fieldClass} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">{t({ de: "Anlegen", en: "Create" })}</Button>
          </div>
        </form>

        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-6">
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            defaultSortId="name"
            getSearchText={(row) => `${t(row.name)} ${row.slug}`}
            onEdit={(row) => setEditing({ ...row, name: { ...row.name } })}
            onDelete={async (row) => {
              await hideCategoryRequest(row.id);
              setNotice(t({ de: "Kategorie ausgeblendet.", en: "Category hidden." }));
              await load();
            }}
            onBulkDelete={async (rows) => {
              await bulkDeleteCategoriesRequest(rows.map((row) => row.id));
              setNotice(t({ de: "Auswahl ausgeblendet.", en: "Selection hidden." }));
              await load();
            }}
            columns={[
              {
                id: "name",
                header: { de: "Name", en: "Name" },
                sort: "alpha",
                getValue: (row) => t(row.name),
                cell: (row) => <span className="font-medium">{t(row.name)}</span>,
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
            <Field label={t({ de: "Name (DE)", en: "Name DE" })}>
              <input className={fieldClass} value={editing.name.de ?? ""} onChange={(e) => setEditing({ ...editing, name: { ...editing.name, de: e.target.value } })} />
            </Field>
            <Field label={t({ de: "Name (EN)", en: "Name EN" })}>
              <input className={fieldClass} value={editing.name.en ?? ""} onChange={(e) => setEditing({ ...editing, name: { ...editing.name, en: e.target.value } })} />
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
