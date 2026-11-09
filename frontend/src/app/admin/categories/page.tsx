"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  createCategoryRequest,
  fetchAdminCategories,
  hideCategoryRequest,
  updateCategoryRequest,
  type ApiCategory,
} from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

export default function AdminCategoriesPage() {
  const { t } = useStore();
  const [items, setItems] = useState<ApiCategory[]>([]);
  const [nameDe, setNameDe] = useState("");
  const [nameEn, setNameEn] = useState("");
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

  async function toggle(item: ApiCategory) {
    try {
      if (item.is_active) await hideCategoryRequest(item.id);
      else await updateCategoryRequest(item.id, { is_active: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktion fehlgeschlagen.", en: "Action failed." }));
    }
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.categories">
        <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Kategorien", en: "Categories" })}</h1>
        {notice ? <p className="mt-3 text-sm text-moss">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

        <form onSubmit={create} className="mt-6 grid max-w-xl gap-3 rounded-3xl border border-line bg-white p-5 sm:grid-cols-2">
          <Field label="Name DE"><input required className={fieldClass} value={nameDe} onChange={(e) => setNameDe(e.target.value)} /></Field>
          <Field label="Name EN"><input required className={fieldClass} value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Button type="submit">{t({ de: "Anlegen", en: "Create" })}</Button>
          </div>
        </form>

        <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white text-sm">
          {loading ? <li className="px-4 py-6 text-muted">Loading…</li> : null}
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{t(item.name)}</p>
                <p className="font-mono text-xs text-muted">
                  {item.slug} · {item.count ?? 0} · {item.is_active ? "active" : "hidden"}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void toggle(item)}>
                {item.is_active ? t({ de: "Ausblenden", en: "Hide" }) : t({ de: "Einblenden", en: "Show" })}
              </Button>
            </li>
          ))}
        </ul>
      </AdminGate>
    </AdminShell>
  );
}
