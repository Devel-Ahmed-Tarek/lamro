"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { emptyCopy, LOCALES, LOCALE_LABELS, type Copy, type Locale } from "@/lib/catalog";
import { aiCatalogTranslateRequest } from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

export type TaxonomyFormValue = {
  name: Copy;
  description: Copy;
  seo_title: Copy;
  seo_description: Copy;
  seo_keywords: Copy;
  slug?: string;
  is_active?: boolean;
  sort?: number;
};

type Props = {
  initial?: Partial<TaxonomyFormValue>;
  mode: "create" | "edit";
  showSort?: boolean;
  busy?: boolean;
  onCancel?: () => void;
  onSubmit: (value: TaxonomyFormValue & { auto_translate: boolean; source_locale: Locale }) => Promise<void>;
};

export function emptyTaxonomy(): TaxonomyFormValue {
  return {
    name: emptyCopy(),
    description: emptyCopy(),
    seo_title: emptyCopy(),
    seo_description: emptyCopy(),
    seo_keywords: emptyCopy(),
    slug: "",
    is_active: true,
    sort: 0,
  };
}

export function TaxonomyForm({ initial, mode, showSort = false, busy = false, onCancel, onSubmit }: Props) {
  const { t } = useStore();
  const [form, setForm] = useState<TaxonomyFormValue>({
    ...emptyTaxonomy(),
    ...initial,
    name: { ...emptyCopy(), ...(initial?.name ?? {}) },
    description: { ...emptyCopy(), ...(initial?.description ?? {}) },
    seo_title: { ...emptyCopy(), ...(initial?.seo_title ?? {}) },
    seo_description: { ...emptyCopy(), ...(initial?.seo_description ?? {}) },
    seo_keywords: { ...emptyCopy(), ...(initial?.seo_keywords ?? {}) },
  });
  const [editLocale, setEditLocale] = useState<Locale>("en");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function patch(field: keyof TaxonomyFormValue, locale: Locale, value: string) {
    setForm((current) => ({
      ...current,
      [field]: { ...(current[field] as Copy), [locale]: value },
    }));
  }

  async function translateNow() {
    setLocalBusy(true);
    setError("");
    try {
      const response = await aiCatalogTranslateRequest({
        source_locale: editLocale,
        name: form.name,
        description: form.description,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        seo_keywords: form.seo_keywords,
      });
      const data = response.data;
      setForm((current) => ({
        ...current,
        name: { ...emptyCopy(), ...data.name },
        description: { ...emptyCopy(), ...data.description },
        seo_title: { ...emptyCopy(), ...data.seo_title },
        seo_description: { ...emptyCopy(), ...data.seo_description },
        seo_keywords: { ...emptyCopy(), ...data.seo_keywords },
      }));
      setNotice(t({ de: "Übersetzungen aktualisiert.", en: "Translations updated." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Übersetzung fehlgeschlagen.", en: "Translate failed." }));
    } finally {
      setLocalBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await onSubmit({
        ...form,
        auto_translate: autoTranslate,
        source_locale: editLocale,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Speichern fehlgeschlagen.", en: "Save failed." }));
    }
  }

  const disabled = busy || localBusy;

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {mode === "create"
              ? t({ de: "Neu anlegen", en: "Create new" })
              : t({ de: "Bearbeiten", en: "Edit" })}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t({
              de: "In einer Sprache schreiben — KI füllt die übrigen Sprachen (Name, Text, SEO).",
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
      {error ? <p className="text-sm text-copper">{error}</p> : null}

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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t({ de: "Name", en: "Name" })} (${editLocale})`}>
          <input
            required
            className={fieldClass}
            value={form.name[editLocale] ?? ""}
            onChange={(e) => patch("name", editLocale, e.target.value)}
          />
        </Field>
        <Field label="Slug">
          <input
            className={fieldClass}
            value={form.slug ?? ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder={t({ de: "optional — aus Name", en: "optional — from name" })}
          />
        </Field>
      </div>

      <Field label={`${t({ de: "Beschreibung", en: "Description" })} (${editLocale})`}>
        <textarea
          className={fieldClass}
          rows={4}
          value={form.description[editLocale] ?? ""}
          onChange={(e) => patch("description", editLocale, e.target.value)}
          placeholder={t({
            de: "Kurztext für die Marken-/Kategorieseite (SEO & Kunden).",
            en: "Short copy for the brand/category page (SEO & customers).",
          })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t({ de: "SEO-Titel", en: "SEO title" })} (${editLocale})`}>
          <input
            className={fieldClass}
            value={form.seo_title[editLocale] ?? ""}
            onChange={(e) => patch("seo_title", editLocale, e.target.value)}
            placeholder={t({ de: "Titel für Suchmaschinen", en: "Title for search engines" })}
          />
        </Field>
        <Field label={`${t({ de: "SEO-Keywords", en: "SEO keywords" })} (${editLocale})`}>
          <input
            className={fieldClass}
            value={form.seo_keywords[editLocale] ?? ""}
            onChange={(e) => patch("seo_keywords", editLocale, e.target.value)}
            placeholder={t({ de: "z.B. Siemens, Umrichter, Ersatzteil", en: "e.g. Siemens, drive, spare part" })}
          />
        </Field>
      </div>

      <Field label={`${t({ de: "SEO-Beschreibung", en: "SEO description" })} (${editLocale})`}>
        <textarea
          className={fieldClass}
          rows={3}
          value={form.seo_description[editLocale] ?? ""}
          onChange={(e) => patch("seo_description", editLocale, e.target.value)}
          placeholder={t({ de: "Meta-Description (ca. 150–160 Zeichen)", en: "Meta description (~150–160 characters)" })}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          {t({ de: "Aktiv", en: "Active" })}
        </label>
        {showSort ? (
          <Field label={t({ de: "Sortierung", en: "Sort" })}>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={form.sort ?? 0}
              onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })}
            />
          </Field>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => void translateNow()}>
          {t({ de: "Jetzt übersetzen (10 Sprachen)", en: "Translate now (10 languages)" })}
        </Button>
        <Button type="submit" disabled={disabled}>
          {t({ de: "Speichern", en: "Save" })}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t({ de: "Abbrechen", en: "Cancel" })}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
