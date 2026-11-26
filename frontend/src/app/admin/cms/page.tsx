"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { emptyCopy, LOCALES, LOCALE_LABELS, type Copy, type Locale } from "@/lib/catalog";
import { aiCatalogTranslateRequest } from "@/lib/catalog-api";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type CmsPage = {
  id: number;
  slug: string;
  title: Copy;
  body: Copy;
  meta_title: Copy;
  meta_description: Copy;
  status: string;
};

function normalizePage(page: CmsPage): CmsPage {
  return {
    ...page,
    title: { ...emptyCopy(), ...(page.title ?? {}) },
    body: { ...emptyCopy(), ...(page.body ?? {}) },
    meta_title: { ...emptyCopy(), ...(page.meta_title ?? {}) },
    meta_description: { ...emptyCopy(), ...(page.meta_description ?? {}) },
  };
}

export default function AdminCmsPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<CmsPage[]>([]);
  const [selected, setSelected] = useState<CmsPage | null>(null);
  const [editLocale, setEditLocale] = useState<Locale>("en");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await adminGet<CmsPage[]>("/api/v1/admin/cms/pages");
    const pages = ((response as { data: CmsPage[] }).data ?? []).map(normalizePage);
    setItems(pages);
    setSelected((current) => {
      if (!current) return current;
      return pages.find((page) => page.id === current.id) ?? current;
    });
  }

  useEffect(() => {
    if (can("admin.cms")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.cms")) {
    return (
      <AdminShell>
        <p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p>
      </AdminShell>
    );
  }

  function patch(field: "title" | "body" | "meta_title" | "meta_description", value: string) {
    if (!selected) return;
    setSelected({
      ...selected,
      [field]: { ...selected[field], [editLocale]: value },
    });
  }

  async function translateNow() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await aiCatalogTranslateRequest({
        source_locale: editLocale,
        name: selected.title,
        description: selected.body,
        seo_title: selected.meta_title,
        seo_description: selected.meta_description,
        seo_keywords: emptyCopy(),
      });
      const data = response.data;
      setSelected({
        ...selected,
        title: { ...emptyCopy(), ...data.name },
        body: { ...emptyCopy(), ...data.description },
        meta_title: { ...emptyCopy(), ...data.seo_title },
        meta_description: { ...emptyCopy(), ...data.seo_description },
      });
      setNotice(t({ de: "Übersetzungen aktualisiert.", en: "Translations updated." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Übersetzung fehlgeschlagen.", en: "Translate failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminPut(`/api/v1/admin/cms/pages/${selected.id}`, {
        title: selected.title,
        body: selected.body,
        meta_title: selected.meta_title,
        meta_description: selected.meta_description,
        status: selected.status,
        auto_translate: autoTranslate,
        source_locale: editLocale,
      });
      await load();
      setNotice(
        autoTranslate
          ? t({ en: "Saved and translated to all site languages." })
          : t({ de: "Gespeichert.", en: "Saved." }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Speichern fehlgeschlagen.", en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Inhalte (CMS)", en: "CMS" })}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t({
          en: "Write legal/content pages in one language. AI fills the rest for the public language switcher.",
        })}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <ul className="rounded-3xl border border-line bg-white p-3 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left hover:bg-paper ${selected?.id === item.id ? "bg-paper font-medium" : ""}`}
                onClick={() => {
                  setSelected(normalizePage(item));
                  setNotice("");
                  setError("");
                }}
              >
                {item.slug}
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <form className="space-y-4 rounded-3xl border border-line bg-white p-5" onSubmit={onSave}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">{selected.slug}</p>
                <p className="mt-1 text-sm text-muted">
                  {t({
                    en: "Write in one language — AI fills the rest (name, text, SEO).",
                  })}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} />
                {t({ de: "Beim Speichern übersetzen", en: "Translate on save" })}
              </label>
            </div>

            {notice ? <p className="text-sm text-moss">{notice}</p> : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setEditLocale(code)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    editLocale === code ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"
                  }`}
                >
                  {LOCALE_LABELS[code]}
                </button>
              ))}
            </div>

            <Field label={`${t({ en: "Title" })} (${LOCALE_LABELS[editLocale]})`}>
              <input
                className={fieldClass}
                value={selected.title[editLocale] || ""}
                onChange={(e) => patch("title", e.target.value)}
              />
            </Field>

            <Field label={`${t({ en: "Body" })} (${LOCALE_LABELS[editLocale]})`}>
              <textarea
                className={fieldClass}
                rows={10}
                value={selected.body[editLocale] || ""}
                onChange={(e) => patch("body", e.target.value)}
              />
            </Field>

            <Field label={`${t({ en: "SEO title" })} (${LOCALE_LABELS[editLocale]})`}>
              <input
                className={fieldClass}
                value={selected.meta_title[editLocale] || ""}
                onChange={(e) => patch("meta_title", e.target.value)}
              />
            </Field>

            <Field label={`${t({ en: "SEO description" })} (${LOCALE_LABELS[editLocale]})`}>
              <textarea
                className={fieldClass}
                rows={3}
                value={selected.meta_description[editLocale] || ""}
                onChange={(e) => patch("meta_description", e.target.value)}
              />
            </Field>

            <Field label={t({ en: "Status" })}>
              <select
                className={fieldClass}
                value={selected.status}
                onChange={(e) => setSelected({ ...selected, status: e.target.value })}
              >
                <option value="published">{t({ en: "Published" })}</option>
                <option value="draft">{t({ en: "Draft" })}</option>
              </select>
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void translateNow()}
                className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
              >
                {t({ de: "Jetzt übersetzen", en: "Translate now" })}
              </button>
              <button type="submit" disabled={busy} className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60">
                {busy ? "…" : t({ de: "Speichern", en: "Save" })}
              </button>
            </div>
          </form>
        ) : (
          <p className="rounded-3xl border border-dashed border-line bg-white p-8 text-sm text-muted">
            {t({ en: "Select a page from the list to edit." })}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
