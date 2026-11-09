"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Button, ConditionBadge, Field, Notice, Plate, TestingBadge, fieldClass } from "@/components/ui";
import { formatMoney, type Product } from "@/lib/catalog";
import { fetchProduct, toCatalogProduct, type ApiMedia, type ApiProduct } from "@/lib/catalog-api";
import { ApiError } from "@/lib/api";
import { createInquiry } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { t, locale, addToCart, features, watch, toggleWatch, authUser, profile } = useStore();
  const [qty, setQty] = useState(1);
  const [panel, setPanel] = useState<"offer" | "quote" | "question" | null>(search.get("offer") === "1" ? "offer" : null);
  const [sent, setSent] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [raw, setRaw] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchProduct(slug)
      .then((response) => {
        if (!alive) return;
        setRaw(response.data);
        setProduct(toCatalogProduct(response.data));
      })
      .catch((err) => {
        if (!alive) return;
        setProduct(null);
        setRaw(null);
        setError(err instanceof ApiError && err.status === 404
          ? t({ de: "Artikel nicht gefunden.", en: "Product not found." })
          : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, t]);

  if (loading) return <Frame><p className="text-sm text-muted">Loading…</p></Frame>;
  if (!product) return <Frame><Notice>{error || t({ de: "Artikel nicht gefunden.", en: "Product not found." })}</Notice></Frame>;

  const image = (raw?.media ?? []).find((item: ApiMedia) => item.type === "image");
  const allowCart = raw?.allow_cart ?? true;
  const allowBuyNow = raw?.allow_buy_now ?? true;
  const allowOffer = raw?.allow_offer ?? true;
  const allowQuote = raw?.allow_quote ?? true;
  const allowInquiry = raw?.allow_inquiry ?? true;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!panel || !product) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      const type = panel === "offer" ? "offer" : panel === "quote" ? "quote" : "inquiry";
      const offerRaw = String(form.get("offer_amount") || "").replace(",", ".");
      await createInquiry({
        type,
        slug: product.slug,
        product_id: raw?.id,
        quantity: panel !== "question" ? Number(form.get("quantity") || qty) : undefined,
        offer_amount: panel === "offer" && offerRaw ? Number(offerRaw) : undefined,
        guest_name: !authUser ? String(form.get("guest_name") || "") : undefined,
        guest_email: !authUser ? String(form.get("guest_email") || "") : undefined,
        message: String(form.get("message") || ""),
      });
      setSent(panel);
      setPanel(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t({ de: "Senden fehlgeschlagen.", en: "Send failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="min-h-72 w-full rounded-3xl object-cover" />
        ) : (
          <Plate brand={product.manufacturer} part={product.partNumber} />
        )}
        <div>
          <p className="font-mono text-sm text-muted">{product.partNumber}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t(product.name)}</h1>
          <p className="mt-3 text-muted">{t(product.summary)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ConditionBadge value={product.condition} />
            <TestingBadge value={product.testing} />
          </div>
          <p className="mt-6 text-3xl font-semibold">{formatMoney(product.price, locale)}</p>
          <p className="mt-1 text-sm text-muted">{product.stock} {t({ de: "verfügbar", en: "available" })} · SKU {product.sku}</p>
          <div className="mt-6 flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => setQty((value) => Math.max(1, value - 1))}>−</Button>
            <span className="w-8 text-center text-sm">{qty}</span>
            <Button variant="secondary" size="icon" onClick={() => setQty((value) => Math.min(product.stock, value + 1))}>+</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {allowCart ? <Button variant="accent" onClick={() => addToCart(product.slug, qty)}>{t({ de: "In den Warenkorb", en: "Add to cart" })}</Button> : null}
            {features.buyNow && allowBuyNow ? <Button onClick={() => { addToCart(product.slug, qty); router.push("/checkout"); }}>{t({ de: "Sofort kaufen", en: "Buy now" })}</Button> : null}
            <Button variant="secondary" onClick={() => toggleWatch(product.slug)}>{watch.includes(product.slug) ? t({ de: "Beobachtet", en: "Watching" }) : t({ de: "Merken", en: "Watch" })}</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {features.makeOffer && allowOffer ? <Button variant="ghost" onClick={() => setPanel("offer")}>{t({ de: "Preisvorschlag", en: "Make an offer" })}</Button> : null}
            {features.quote && allowQuote ? <Button variant="ghost" onClick={() => setPanel("quote")}>{t({ de: "Angebot anfordern", en: "Request a quote" })}</Button> : null}
            {features.inquiry && allowInquiry ? <Button variant="ghost" onClick={() => setPanel("question")}>{t({ de: "Frage stellen", en: "Ask a question" })}</Button> : null}
            <Button variant="ghost" onClick={() => navigator.clipboard.writeText(window.location.href)}>{t({ de: "Link kopieren", en: "Copy link" })}</Button>
          </div>
          {sent ? <p className="mt-4 text-sm text-moss">{t({ de: "Gesendet. Sie finden die Anfrage unter Konto → Nachrichten.", en: "Sent. Find it under Account → Messages." })}</p> : null}
        </div>
      </div>

      {panel ? (
        <form className="mt-8 max-w-lg space-y-4 rounded-2xl border border-line bg-white p-5" onSubmit={onSubmit}>
          <h2 className="font-semibold">{panel === "offer" ? t({ de: "Preisvorschlag", en: "Make an offer" }) : panel === "quote" ? t({ de: "Angebotsanfrage", en: "Quote request" }) : t({ de: "Frage zum Artikel", en: "Question about this item" })}</h2>
          <p className="font-mono text-xs text-muted">{product.partNumber} · {product.sku}</p>
          {panel !== "question" ? <Field label={t({ de: "Menge", en: "Quantity" })}><input name="quantity" className={fieldClass} defaultValue={qty} /></Field> : null}
          {panel === "offer" ? <Field label={t({ de: "Ihr Preis", en: "Your price" })}><input name="offer_amount" className={fieldClass} placeholder="EUR" required /></Field> : null}
          {!authUser ? (
            <>
              <Field label={t({ de: "Name", en: "Name" })}><input name="guest_name" required className={fieldClass} defaultValue={profile.name} /></Field>
              <Field label={t({ de: "E-Mail", en: "Email" })}><input name="guest_email" required type="email" className={fieldClass} defaultValue={profile.email} /></Field>
            </>
          ) : null}
          <Field label={t({ de: "Nachricht", en: "Message" })}><textarea name="message" required rows={4} className={fieldClass} /></Field>
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>{busy ? "…" : t({ de: "Senden", en: "Send" })}</Button>
            <Button variant="ghost" type="button" onClick={() => setPanel(null)}>{t({ de: "Abbrechen", en: "Cancel" })}</Button>
          </div>
        </form>
      ) : null}

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">{t({ de: "Technische Daten", en: "Specifications" })}</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
            {[
              ["Manufacturer", product.manufacturer],
              ["Model", product.model],
              ["SKU", product.sku],
              [t({ de: "Serie", en: "Serial" }), product.serial],
              [t({ de: "Gewicht", en: "Weight" }), product.weight],
              [t({ de: "Maße", en: "Dimensions" }), product.dimensions],
              ...product.specs.map((spec) => [t(spec.label), spec.value] as const),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2"><dt className="text-muted">{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="font-semibold">{t({ de: "Bekannte Hinweise", en: "Known notes" })}</h2>
          <p className="mt-4 text-sm leading-6">{t(product.notes)}</p>
          <button type="button" className="mt-6 text-sm text-copper">{t({ de: "Datenblatt laden", en: "Download datasheet" })}</button>
          <p className="mt-6 text-sm"><Link href="/auctions" className="text-copper">{t({ de: "Passende Auktionen ansehen", en: "See related auctions" })}</Link></p>
        </div>
      </section>
    </Frame>
  );
}
