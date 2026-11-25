"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog";
import { adminGet } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type OverviewActivity = {
  id: number;
  action: string;
  href: string;
  actor?: string | null;
  created_at?: string | null;
};

type Overview = {
  products: number;
  live_auctions: number;
  company_stock_pending: number;
  auction_applications_pending: number;
  open_orders: number;
  customers: number;
  open_inquiries: number;
  revenue_cents: number;
  store_revenue_cents: number;
  auction_revenue_cents: number;
  activity: OverviewActivity[];
};

function relativeTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de" : "en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

function actionLabel(action: string, locale: string): string {
  const map: Record<string, { de: string; en: string }> = {
    "order.created": { de: "Neue Bestellung erstellt", en: "New order created" },
    "order.cancelled": { de: "Bestellung storniert", en: "Order cancelled" },
    "order.tracking": { de: "Sendungsnummer aktualisiert", en: "Tracking updated" },
    "order.refunded": { de: "Erstattung ausgeführt", en: "Refund completed" },
    "auction.checkout": { de: "Auktionsgewinn abgerechnet", en: "Auction win checked out" },
    "payment.received": { de: "Zahlung eingegangen", en: "Payment received" },
    "payment.failed": { de: "Zahlung fehlgeschlagen", en: "Payment failed" },
    "payment.stripe_demo": { de: "Stripe-Demozahlung", en: "Stripe demo payment" },
    "payment.stripe_webhook": { de: "Stripe-Webhook verarbeitet", en: "Stripe webhook processed" },
    "customer.suspend": { de: "Kunde gesperrt", en: "Customer suspended" },
    "customer.reinstate": { de: "Kunde reaktiviert", en: "Customer reinstated" },
    "feature.updated": { de: "Funktion aktualisiert", en: "Feature updated" },
    "system.backup": { de: "Backup erstellt", en: "Backup created" },
    "credit_note.issued": { de: "Gutschrift ausgestellt", en: "Credit note issued" },
    "tax.updated": { de: "Steuer aktualisiert", en: "Tax updated" },
  };
  const hit = map[action];
  if (hit) return locale === "de" ? hit.de : hit.en;
  return action.replace(/\./g, " · ");
}

export default function AdminOverviewPage() {
  const { t, locale, can } = useStore();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!can("admin.overview")) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const response = await adminGet<Overview>("/api/v1/admin/overview");
      setData((response as { data: Overview }).data);
    } catch {
      setError(t({ de: "Übersicht konnte nicht geladen werden.", en: "Could not load overview." }));
    } finally {
      setLoading(false);
    }
  }, [can, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const kpis = data
    ? [
        { label: t({ de: "Artikel", en: "Products" }), value: String(data.products), href: "/admin/products" },
        { label: t({ de: "Live-Auktionen", en: "Live auctions" }), value: String(data.live_auctions), href: "/admin/auctions" },
        {
          label: t({ de: "Firmenlager wartend", en: "Company stock pending" }),
          value: String(data.company_stock_pending),
          href: "/admin/company-stock",
        },
        { label: t({ de: "Offene Bestellungen", en: "Open orders" }), value: String(data.open_orders), href: "/admin/orders" },
        {
          label: t({ de: "Shop-Umsatz", en: "Store revenue" }),
          value: formatMoney(data.store_revenue_cents / 100, locale),
          href: "/admin/reports",
        },
        {
          label: t({ de: "Offene Anfragen", en: "Open inquiries" }),
          value: String(data.open_inquiries),
          href: "/admin/messages",
        },
      ]
    : [];

  const quick = [
    { href: "/admin/products", label: t({ de: "Artikel anlegen", en: "Create product" }) },
    { href: "/admin/team", label: t({ de: "Team verwalten", en: "Manage team" }) },
    { href: "/admin/roles", label: t({ de: "Rollen steuern", en: "Manage roles" }) },
    { href: "/admin/company-stock", label: t({ de: "Firmenlager prüfen", en: "Review company stock" }) },
    { href: "/admin/auctions", label: t({ de: "Auktionen überwachen", en: "Monitor auctions" }) },
    { href: "/admin/orders", label: t({ de: "Bestellungen öffnen", en: "Open orders" }) },
    { href: "/admin/features", label: t({ de: "Funktionen schalten", en: "Switch features" }) },
    { href: "/admin/reports", label: t({ de: "Berichte öffnen", en: "Open reports" }) },
  ];

  if (!can("admin.overview")) {
    return (
      <AdminShell>
        <p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Dashboard", en: "Dashboard" })}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t({ de: "Übersicht", en: "Overview" })}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {t({
              de: "Live-Zahlen aus dem System — aktualisieren sich automatisch.",
              en: "Live numbers from the system — refresh automatically.",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="rounded-2xl border border-line bg-white px-4 py-2 text-sm transition hover:border-copper/40"
          >
            {t({ de: "Aktualisieren", en: "Refresh" })}
          </button>
          <ButtonLink href="/admin/features" variant="secondary">{t({ de: "Funktionen", en: "Features" })}</ButtonLink>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl border border-line bg-white/70" />
            ))
          : kpis.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-3xl border border-line bg-white p-5 shadow-[0_12px_28px_-22px_rgba(18,18,18,0.45)] transition hover:-translate-y-0.5 hover:border-copper/40"
              >
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
              </Link>
            ))}
      </div>

      {data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
            <span className="text-muted">{t({ de: "Kunden", en: "Customers" })}</span>
            <span className="ml-2 font-semibold">{data.customers}</span>
          </div>
          <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
            <span className="text-muted">{t({ de: "Auktionsumsatz", en: "Auction revenue" })}</span>
            <span className="ml-2 font-semibold">{formatMoney(data.auction_revenue_cents / 100, locale)}</span>
          </div>
          <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
            <span className="text-muted">{t({ de: "Auktionsanfragen", en: "Auction applications" })}</span>
            <span className="ml-2 font-semibold">{data.auction_applications_pending}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t({ de: "Letzte Aktivität", en: "Recent activity" })}</h2>
            <Link href="/admin/audit" className="text-sm text-copper">
              {t({ de: "Alles anzeigen", en: "View all" })}
            </Link>
          </div>
          {!data || data.activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t({ de: "Noch keine Aktivität.", en: "No activity yet." })}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-1 py-3 text-sm transition hover:text-copper sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {actionLabel(item.action, locale)}
                      {item.actor ? <span className="text-muted"> · {item.actor}</span> : null}
                    </span>
                    <span className="text-xs text-muted">{relativeTime(item.created_at, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-ink p-5 text-white">
          <h2 className="text-lg font-semibold">{t({ de: "Schnellzugriff", en: "Quick links" })}</h2>
          <div className="mt-4 grid gap-2">
            {quick.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15">
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
