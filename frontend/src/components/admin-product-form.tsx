"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import type { Copy } from "@/lib/catalog";
import {
  archiveProductRequest,
  createProductRequest,
  deleteProductMediaRequest,
  fetchAdminBrands,
  fetchAdminCategories,
  publishProductRequest,
  unpublishProductRequest,
  updateProductRequest,
  uploadProductMediaRequest,
  type ApiBrand,
  type ApiCategory,
  type ApiMedia,
  type ApiProduct,
  type ProductPayload,
} from "@/lib/catalog-api";
import { useStore } from "@/lib/store";

type SpecDraft = { label: Copy; value: string };

type FormState = {
  name: Copy;
  summary: Copy;
  notes: Copy;
  slug: string;
  category_id: string;
  brand_id: string;
  part_number: string;
  model: string;
  sku: string;
  serial: string;
  condition: string;
  testing: string;
  price: string;
  total_stock: string;
  reserved_auction: string;
  reserved_order: string;
  weight: string;
  dimensions: string;
  allow_cart: boolean;
  allow_buy_now: boolean;
  allow_offer: boolean;
  allow_quote: boolean;
  allow_inquiry: boolean;
  specs: SpecDraft[];
};

const emptyCopy = (): Copy => ({ de: "", en: "" });

function fromProduct(product?: ApiProduct | null): FormState {
  return {
    name: product?.name ?? emptyCopy(),
    summary: product?.summary ?? emptyCopy(),
    notes: product?.notes ?? emptyCopy(),
    slug: product?.slug ?? "",
    category_id: product?.category_id ? String(product.category_id) : "",
    brand_id: product?.brand_id ? String(product.brand_id) : "",
    part_number: product?.part_number ?? "",
    model: product?.model ?? "",
    sku: product?.sku ?? "",
    serial: product?.serial ?? "",
    condition: product?.condition ?? "used",
    testing: product?.testing ?? "tested",
    price: product ? String(product.price) : "",
    total_stock: String(product?.total_stock ?? 0),
    reserved_auction: String(product?.reserved_auction ?? 0),
    reserved_order: String(product?.reserved_order ?? 0),
    weight: product?.weight ?? "",
    dimensions: product?.dimensions ?? "",
    allow_cart: product?.allow_cart ?? true,
    allow_buy_now: product?.allow_buy_now ?? true,
    allow_offer: product?.allow_offer ?? true,
    allow_quote: product?.allow_quote ?? true,
    allow_inquiry: product?.allow_inquiry ?? true,
    specs: product?.specs?.length
      ? product.specs.map((spec) => ({ label: spec.label ?? emptyCopy(), value: spec.value }))
      : [{ label: emptyCopy(), value: "" }],
  };
}

function toPayload(form: FormState, status: ProductPayload["status"]): ProductPayload {
  return {
    name: form.name,
    summary: form.summary,
    notes: form.notes,
    slug: form.slug || undefined,
    category_id: form.category_id ? Number(form.category_id) : null,
    brand_id: form.brand_id ? Number(form.brand_id) : null,
    part_number: form.part_number || null,
    model: form.model || null,
    sku: form.sku || null,
    serial: form.serial || null,
    condition: form.condition || null,
    testing: form.testing || null,
    price: form.price === "" ? null : Number(form.price),
    total_stock: Number(form.total_stock || 0),
    reserved_auction: Number(form.reserved_auction || 0),
    reserved_order: Number(form.reserved_order || 0),
    weight: form.weight || null,
    dimensions: form.dimensions || null,
    status,
    allow_cart: form.allow_cart,
    allow_buy_now: form.allow_buy_now,
    allow_offer: form.allow_offer,
    allow_quote: form.allow_quote,
    allow_inquiry: form.allow_inquiry,
    specs: form.specs.filter((spec) => spec.value.trim()),
  };
}

export function AdminProductForm({ product }: { product?: ApiProduct | null }) {
  const { t } = useStore();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromProduct(product));
  const [media, setMedia] = useState<ApiMedia[]>(product?.media ?? []);
  const [status, setStatus] = useState(product?.status ?? "draft");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [productId, setProductId] = useState<number | null>(product?.id ?? null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([fetchAdminCategories(), fetchAdminBrands()])
      .then(([cats, brandRes]) => {
        setCategories(cats.data);
        setBrands(brandRes.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setForm(fromProduct(product));
    setMedia(product?.media ?? []);
    setStatus(product?.status ?? "draft");
    setProductId(product?.id ?? null);
  }, [product]);

  const available = useMemo(
    () => Math.max(0, Number(form.total_stock || 0) - Number(form.reserved_auction || 0) - Number(form.reserved_order || 0)),
    [form.total_stock, form.reserved_auction, form.reserved_order],
  );

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchCopy(key: "name" | "summary" | "notes", locale: "de" | "en", value: string) {
    setForm((current) => ({ ...current, [key]: { ...current[key], [locale]: value } }));
  }

  async function save(nextStatus: ProductPayload["status"]) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = toPayload(form, nextStatus);
      const response = productId
        ? await updateProductRequest(productId, payload)
        : await createProductRequest(payload);
      setProductId(response.data.id);
      setStatus(response.data.status);
      setForm(fromProduct(response.data));
      setMedia(response.data.media ?? []);
      setNotice(t({ de: "Gespeichert.", en: "Saved." }));
      if (!product && response.data.id) {
        router.replace(`/admin/products/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Speichern fehlgeschlagen.", en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function runStatus(action: "publish" | "unpublish" | "archive") {
    if (!productId) {
      await save(action === "publish" ? "published" : action === "archive" ? "archived" : "draft");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response =
        action === "publish"
          ? await publishProductRequest(productId)
          : action === "unpublish"
            ? await unpublishProductRequest(productId)
            : await archiveProductRequest(productId);
      setStatus(response.data.status);
      setNotice(t({ de: "Status aktualisiert.", en: "Status updated." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktion fehlgeschlagen.", en: "Action failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    if (!productId) {
      setError(t({ de: "Bitte zuerst speichern, dann Medien hochladen.", en: "Save first, then upload media." }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await uploadProductMediaRequest(productId, file);
      setMedia((current) => [...current, response.data]);
      setNotice(t({ de: "Datei hochgeladen.", en: "File uploaded." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Upload fehlgeschlagen.", en: "Upload failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(mediaId: number) {
    if (!productId) return;
    setBusy(true);
    try {
      await deleteProductMediaRequest(productId, mediaId);
      setMedia((current) => current.filter((item) => item.id !== mediaId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Löschen fehlgeschlagen.", en: "Delete failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">
            {status} · {available} {t({ de: "verfügbar", en: "available" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {product ? t({ de: "Artikel bearbeiten", en: "Edit product" }) : t({ de: "Neuer Artikel", en: "New product" })}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => void save("draft")}>
            {t({ de: "Entwurf speichern", en: "Save draft" })}
          </Button>
          <Button variant="accent" disabled={busy} onClick={() => void save("published")}>
            {t({ de: "Speichern & Publish", en: "Save & publish" })}
          </Button>
          {status === "published" ? (
            <Button variant="ghost" disabled={busy} onClick={() => void runStatus("unpublish")}>
              Unpublish
            </Button>
          ) : (
            <Button variant="ghost" disabled={busy || !productId} onClick={() => void runStatus("publish")}>
              Publish
            </Button>
          )}
          <Button variant="ghost" disabled={busy || !productId} onClick={() => void runStatus("archive")}>
            Archive
          </Button>
          <Button variant="ghost" disabled>
            {t({ de: "AI Generate", en: "AI Generate" })}
          </Button>
        </div>
      </div>

      {notice ? <p className="text-sm text-moss">{notice}</p> : null}
      {error ? <p className="text-sm text-copper">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
          <h2 className="font-semibold">{t({ de: "Namen & Texte", en: "Names & copy" })}</h2>
          <Field label="Name DE"><input className={fieldClass} value={form.name.de} onChange={(e) => patchCopy("name", "de", e.target.value)} /></Field>
          <Field label="Name EN"><input className={fieldClass} value={form.name.en} onChange={(e) => patchCopy("name", "en", e.target.value)} /></Field>
          <Field label="Summary DE"><textarea className={fieldClass} rows={3} value={form.summary.de} onChange={(e) => patchCopy("summary", "de", e.target.value)} /></Field>
          <Field label="Summary EN"><textarea className={fieldClass} rows={3} value={form.summary.en} onChange={(e) => patchCopy("summary", "en", e.target.value)} /></Field>
          <Field label="Notes DE"><textarea className={fieldClass} rows={3} value={form.notes.de} onChange={(e) => patchCopy("notes", "de", e.target.value)} /></Field>
          <Field label="Notes EN"><textarea className={fieldClass} rows={3} value={form.notes.en} onChange={(e) => patchCopy("notes", "en", e.target.value)} /></Field>
          <Field label="Slug"><input className={fieldClass} value={form.slug} onChange={(e) => patch("slug", e.target.value)} placeholder="auto" /></Field>
        </section>

        <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
          <h2 className="font-semibold">{t({ de: "Klassifikation", en: "Classification" })}</h2>
          <Field label={t({ de: "Kategorie", en: "Category" })}>
            <select className={fieldClass} value={form.category_id} onChange={(e) => patch("category_id", e.target.value)}>
              <option value="">—</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{t(item.name)}</option>
              ))}
            </select>
          </Field>
          <Field label={t({ de: "Hersteller", en: "Brand" })}>
            <select className={fieldClass} value={form.brand_id} onChange={(e) => patch("brand_id", e.target.value)}>
              <option value="">—</option>
              {brands.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Part number"><input className={fieldClass} value={form.part_number} onChange={(e) => patch("part_number", e.target.value)} /></Field>
            <Field label="Model"><input className={fieldClass} value={form.model} onChange={(e) => patch("model", e.target.value)} /></Field>
            <Field label="SKU"><input className={fieldClass} value={form.sku} onChange={(e) => patch("sku", e.target.value)} /></Field>
            <Field label="Serial"><input className={fieldClass} value={form.serial} onChange={(e) => patch("serial", e.target.value)} /></Field>
            <Field label="Condition">
              <select className={fieldClass} value={form.condition} onChange={(e) => patch("condition", e.target.value)}>
                {["new", "used", "refurbished", "parts"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Testing">
              <select className={fieldClass} value={form.testing} onChange={(e) => patch("testing", e.target.value)}>
                {["tested", "working", "untested", "defective", "partial", "unknown"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
          <h2 className="font-semibold">{t({ de: "Preis & Lager", en: "Price & stock" })}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price (EUR)"><input type="number" step="0.01" min="0" className={fieldClass} value={form.price} onChange={(e) => patch("price", e.target.value)} /></Field>
            <Field label="Total stock"><input type="number" min="0" className={fieldClass} value={form.total_stock} onChange={(e) => patch("total_stock", e.target.value)} /></Field>
            <Field label="Reserved auction"><input type="number" min="0" className={fieldClass} value={form.reserved_auction} onChange={(e) => patch("reserved_auction", e.target.value)} /></Field>
            <Field label="Reserved order"><input type="number" min="0" className={fieldClass} value={form.reserved_order} onChange={(e) => patch("reserved_order", e.target.value)} /></Field>
            <Field label="Weight"><input className={fieldClass} value={form.weight} onChange={(e) => patch("weight", e.target.value)} /></Field>
            <Field label="Dimensions"><input className={fieldClass} value={form.dimensions} onChange={(e) => patch("dimensions", e.target.value)} /></Field>
          </div>
          <p className="text-xs text-muted">{t({ de: "Verfügbar", en: "Available" })}: {available}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["allow_cart", "Cart"],
              ["allow_buy_now", "Buy now"],
              ["allow_offer", "Offer"],
              ["allow_quote", "Quote"],
              ["allow_inquiry", "Inquiry"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form[key]} onChange={(e) => patch(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Specs</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => patch("specs", [...form.specs, { label: emptyCopy(), value: "" }])}
            >
              +
            </Button>
          </div>
          <div className="space-y-3">
            {form.specs.map((spec, index) => (
              <div key={index} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-3">
                <input
                  className={fieldClass}
                  placeholder="Label DE"
                  value={spec.label.de}
                  onChange={(e) => {
                    const specs = [...form.specs];
                    specs[index] = { ...spec, label: { ...spec.label, de: e.target.value } };
                    patch("specs", specs);
                  }}
                />
                <input
                  className={fieldClass}
                  placeholder="Label EN"
                  value={spec.label.en}
                  onChange={(e) => {
                    const specs = [...form.specs];
                    specs[index] = { ...spec, label: { ...spec.label, en: e.target.value } };
                    patch("specs", specs);
                  }}
                />
                <input
                  className={fieldClass}
                  placeholder="Value"
                  value={spec.value}
                  onChange={(e) => {
                    const specs = [...form.specs];
                    specs[index] = { ...spec, value: e.target.value };
                    patch("specs", specs);
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Media</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-ink">
            <input
              type="file"
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={(e) => void onUpload(e.target.files?.[0])}
            />
            {t({ de: "Datei hochladen", en: "Upload file" })}
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-line">
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="grid h-36 place-items-center bg-paper text-xs text-muted">{item.type}</div>
              )}
              <div className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className="truncate">{item.original_name ?? item.type}</span>
                <button type="button" className="text-copper" onClick={() => void removeMedia(item.id)}>
                  {t({ de: "Löschen", en: "Delete" })}
                </button>
              </div>
            </div>
          ))}
          {media.length === 0 ? <p className="text-sm text-muted">{t({ de: "Noch keine Dateien.", en: "No files yet." })}</p> : null}
        </div>
      </section>

      {productId && status === "published" ? (
        <p className="text-sm">
          <Link href={`/store/${form.slug}`} className="text-copper">
            {t({ de: "Im Shop ansehen", en: "View in store" })}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
