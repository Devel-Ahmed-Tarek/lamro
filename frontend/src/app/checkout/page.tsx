"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Field, Notice, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/catalog";
import { checkoutCart, fetchCart, fetchStripeConfig, type ApiCart, type ApiOrder } from "@/lib/commerce-api";
import { fetchShippingMethods } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function CheckoutPage() {
  const { t, locale, authUser, profile, clearCart, ready } = useStore();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [placed, setPlaced] = useState<ApiOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("DE");
  const [notes, setNotes] = useState("");
  const [methods, setMethods] = useState<Array<{ id: number; name: { de: string; en: string }; price: number }>>([]);
  const [methodId, setMethodId] = useState<number | undefined>();
  const [payMethod, setPayMethod] = useState<"bank_transfer" | "stripe">("stripe");
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeDemo, setStripeDemo] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (profile.name) setName(profile.name);
  }, [ready, profile.name]);

  useEffect(() => {
    void fetchShippingMethods().then((response) => {
      setMethods(response.data);
      if (response.data[0]) setMethodId(response.data[0].id);
    });
    void fetchStripeConfig().then((response) => {
      setStripeEnabled(response.data.enabled);
      setStripeDemo(response.data.demo);
      if (!response.data.enabled) setPayMethod("bank_transfer");
    }).catch(() => setPayMethod("bank_transfer"));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    fetchCart()
      .then((response) => setCart(response.data))
      .catch(() => setError(t({ de: "Warenkorb laden fehlgeschlagen.", en: "Failed to load cart." })));
  }, [authUser, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!authUser) {
      setError(t({ de: "Bitte anmelden.", en: "Please log in." }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await checkoutCart({
        shipping_name: name,
        shipping_line1: line1,
        shipping_city: city,
        shipping_postcode: postcode,
        shipping_country: country,
        shipping_method_id: methodId,
        payment_method: payMethod,
        notes,
      });
      clearCart();
      if (payMethod === "stripe" && response.checkout_url) {
        window.location.href = response.checkout_url;
        return;
      }
      setPlaced(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Bestellung fehlgeschlagen.", en: "Checkout failed." }));
    } finally {
      setBusy(false);
    }
  }

  if (!authUser) {
    return (
      <Frame>
        <PageIntro kicker={t({ de: "Kasse", en: "Checkout" })} title={t({ de: "Anmelden erforderlich.", en: "Login required." })} />
        <div className="mt-8"><Notice><Link href="/login" className="text-copper">{t({ de: "Zur Anmeldung", en: "Go to login" })}</Link></Notice></div>
      </Frame>
    );
  }

  if (placed) {
    return (
      <Frame>
        <PageIntro
          kicker={t({ de: "Bestellung", en: "Order" })}
          title={t({ de: "Bestellung aufgenommen.", en: "Order received." })}
          lede={t({
            de: "Zahlung per Banküberweisung. Die Rechnung folgt nach Bestätigung.",
            en: "Pay by bank transfer. Invoice follows confirmation.",
          })}
        />
        <p className="mt-6 font-mono text-sm">{placed.number}</p>
        <p className="mt-2 text-sm">{t({ de: "Gesamt", en: "Total" })}: {formatMoney(placed.total, locale)}</p>
        <Link href="/account/orders" className="mt-6 inline-block text-sm text-copper">{t({ de: "Bestellung ansehen", en: "View order" })}</Link>
      </Frame>
    );
  }

  const items = cart?.items ?? [];
  const selected = methods.find((method) => method.id === methodId);
  const shippingPrice = selected?.price ?? 0;

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Kasse", en: "Checkout" })} title={t({ de: "Bestellung abschließen.", en: "Place the order." })} />
      {items.length === 0 ? (
        <div className="mt-8"><Notice>{t({ de: "Nichts zur Kasse.", en: "Nothing to check out." })} <Link href="/store" className="text-copper">{t({ de: "Zum Shop", en: "Store" })}</Link></Notice></div>
      ) : (
        <form className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]" onSubmit={onSubmit}>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t({ de: "Name", en: "Name" })}><input required className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label={t({ de: "E-Mail", en: "Email" })}><input required type="email" className={fieldClass} value={profile.email} readOnly /></Field>
              <Field label={t({ de: "Straße", en: "Street" })}><input required className={fieldClass} value={line1} onChange={(e) => setLine1(e.target.value)} /></Field>
              <Field label={t({ de: "PLZ", en: "Postcode" })}><input required className={fieldClass} value={postcode} onChange={(e) => setPostcode(e.target.value)} /></Field>
              <Field label={t({ de: "Ort", en: "City" })}><input required className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              <Field label={t({ de: "Land (ISO)", en: "Country (ISO)" })}><input required maxLength={2} className={fieldClass} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} /></Field>
              <Field label={t({ de: "Notiz", en: "Notes" })}><textarea className={fieldClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">{t({ de: "Versand", en: "Shipping" })}</legend>
              <div className="mt-3 grid gap-2">
                {methods.map((method) => (
                  <label key={method.id} className="flex justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="radio" name="ship" checked={methodId === method.id} onChange={() => setMethodId(method.id)} />
                      {locale === "de" ? method.name.de : method.name.en}
                    </span>
                    <span>{formatMoney(method.price, locale)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">{t({ de: "Zahlung", en: "Payment" })}</legend>
              <div className="mt-3 grid gap-2">
                {stripeEnabled ? (
                  <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm">
                    <input type="radio" name="pay" checked={payMethod === "stripe"} onChange={() => setPayMethod("stripe")} />
                    Stripe {stripeDemo ? `(${t({ de: "Demo", en: "Demo" })})` : "(Test/Live)"}
                  </label>
                ) : null}
                <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm">
                  <input type="radio" name="pay" checked={payMethod === "bank_transfer"} onChange={() => setPayMethod("bank_transfer")} />
                  {t({ de: "Banküberweisung", en: "Bank transfer" })}
                </label>
              </div>
            </fieldset>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <aside className="h-fit rounded-2xl bg-ink p-5 text-paper">
            <p className="text-sm text-white/60">{items.length} {t({ de: "Positionen", en: "lines" })}</p>
            <p className="mt-4 text-2xl font-semibold">{formatMoney((cart?.subtotal ?? 0) + shippingPrice, locale)}</p>
            <p className="mt-1 text-xs text-white/60">{t({ de: "zzgl. Steuer in der Rechnung", en: "plus tax on the invoice" })}</p>
            <button disabled={busy} className="mt-6 w-full rounded-full bg-copper py-2.5 text-sm font-medium disabled:opacity-60">
              {busy ? "…" : payMethod === "stripe"
                ? t({ de: "Mit Stripe bezahlen", en: "Pay with Stripe" })
                : t({ de: "Zahlungspflichtig bestellen", en: "Place order" })}
            </button>
          </aside>
        </form>
      )}
    </Frame>
  );
}
