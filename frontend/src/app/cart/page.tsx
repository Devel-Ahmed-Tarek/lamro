"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Notice, PageIntro, fieldClass } from "@/components/ui";
import { formatMoney, type Copy } from "@/lib/catalog";
import { fetchCart, type ApiCartItem } from "@/lib/commerce-api";
import { applyCoupon } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function CartPage() {
  const { t, locale, cart, setQty, authUser, role, features } = useStore();
  const [serverItems, setServerItems] = useState<ApiCartItem[] | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [error, setError] = useState("");

  function reload() {
    if (!authUser || role === "admin") {
      setServerItems(null);
      return;
    }
    fetchCart()
      .then((response) => {
        setServerItems(response.data.items);
        setCouponApplied(response.data.coupon_code ?? null);
      })
      .catch(() => setError(t({ de: "Warenkorb konnte nicht geladen werden.", en: "Could not load cart." })));
  }

  useEffect(() => {
    reload();
  }, [authUser, role, cart, t]);

  const lines = (serverItems ?? []).map((item) => ({
    slug: item.slug,
    qty: item.quantity,
    name: item.name as Copy,
    partNumber: item.part_number ?? "",
    price: item.price,
    stock: item.available_stock,
  }));

  const display = serverItems ? lines : [];
  const subtotal = serverItems ? serverItems.reduce((sum, item) => sum + item.line_total, 0) : 0;

  async function onCoupon(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await applyCoupon(coupon || null);
      reload();
    } catch {
      setError(t({ de: "Code ungültig.", en: "Invalid code." }));
    }
  }

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Kasse", en: "Checkout" })} title={t({ de: "Warenkorb", en: "Cart" })} />
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {!authUser ? (
        <div className="mt-6"><Notice>{t({ de: "Bitte anmelden, um den Warenkorb zu kaufen.", en: "Please log in to check out." })} <Link href="/login" className="text-copper">{t({ de: "Anmelden", en: "Log in" })}</Link></Notice></div>
      ) : null}
      {display.length === 0 ? (
        <div className="mt-8"><Notice>{t({ de: "Der Warenkorb ist leer.", en: "Your cart is empty." })} <Link href="/store" className="text-copper">{t({ de: "Zum Shop", en: "Go to the store" })}</Link></Notice></div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-line border-y border-line">
            {display.map((line) => (
              <li key={line.slug} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <Link href={`/store/${line.slug}`} className="font-medium">{t(line.name)}</Link>
                  <p className="font-mono text-xs text-muted">{line.partNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQty(line.slug, line.qty - 1)}>−</button>
                  <span>{line.qty}</span>
                  <button type="button" onClick={() => setQty(line.slug, Math.min(line.stock || 99, line.qty + 1))}>+</button>
                  <span className="w-24 text-right">{formatMoney(line.price * line.qty, locale)}</span>
                  <button type="button" className="text-sm text-muted" onClick={() => setQty(line.slug, 0)}>{t({ de: "Entfernen", en: "Remove" })}</button>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-line bg-white p-5">
            {features.coupons ? (
              <form className="flex gap-2" onSubmit={onCoupon}>
                <input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder={t({ de: "Gutschein", en: "Coupon" })} className={fieldClass} />
                <button className="rounded-lg bg-ink px-3 text-sm text-paper">{t({ de: "Einlösen", en: "Apply" })}</button>
              </form>
            ) : null}
            {couponApplied ? (
              <p className="mt-2 text-sm text-moss">
                {couponApplied}{" "}
                <button type="button" className="text-copper" onClick={() => void applyCoupon(null).then(reload)}>
                  {t({ de: "entfernen", en: "remove" })}
                </button>
              </p>
            ) : null}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>{t({ de: "Zwischensumme", en: "Subtotal" })}</dt><dd>{formatMoney(subtotal, locale)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{t({ de: "Summe", en: "Total" })}</dt><dd>{formatMoney(subtotal, locale)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">{t({ de: "Steuer, Versand und Rabatt an der Kasse.", en: "Tax, shipping and discounts at checkout." })}</p>
            {authUser ? (
              <Link href="/checkout" className="mt-5 block rounded-full bg-copper py-2.5 text-center text-sm font-medium text-white">{t({ de: "Zur Kasse", en: "Checkout" })}</Link>
            ) : null}
          </aside>
        </div>
      )}
    </Frame>
  );
}
