"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { ButtonLink } from "@/components/ui/button";
import { auctions, formatMoney, products } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function AdminOverviewPage() {
  const { t, locale } = useStore();
  const liveAuctions = auctions.filter((auction) => auction.status === "live").length;

  const kpis = [
    { label: t({ de: "Artikel", en: "Products" }), value: String(products.length), href: "/admin/products" },
    { label: t({ de: "Live-Auktionen", en: "Live auctions" }), value: String(liveAuctions), href: "/admin/auctions" },
    { label: t({ de: "Verkäufer wartend", en: "Sellers pending" }), value: "1", href: "/admin/sellers" },
    { label: t({ de: "Offene Bestellungen", en: "Open orders" }), value: "3", href: "/admin/orders" },
    { label: t({ de: "Shop-Umsatz (Demo)", en: "Store revenue (demo)" }), value: formatMoney(4280, locale), href: "/admin/reports" },
    { label: t({ de: "Provisionen (Demo)", en: "Commissions (demo)" }), value: formatMoney(186, locale), href: "/admin/commissions" },
  ];

  const activity = [
    { time: t({ de: "vor 12 Min.", en: "12 min ago" }), text: t({ de: "Rhein Maschinenhandel wartet auf Freigabe.", en: "Rhein Maschinenhandel awaits approval." }), href: "/admin/sellers" },
    { time: t({ de: "vor 40 Min.", en: "40 min ago" }), text: t({ de: "Live-Auktion ACS580 hat ein neues Gebot.", en: "Live auction ACS580 received a new bid." }), href: "/admin/auctions" },
    { time: t({ de: "vor 2 Std.", en: "2 hr ago" }), text: t({ de: "Bestellung #1044 wartet auf Banküberweisung.", en: "Order #1044 waits for bank transfer." }), href: "/admin/orders" },
    { time: t({ de: "gestern", en: "yesterday" }), text: t({ de: "Funktion Sofortkauf ist aktiv.", en: "Buy now is enabled." }), href: "/admin/features" },
  ];

  const quick = [
    { href: "/admin/products", label: t({ de: "Artikel anlegen", en: "Create product" }) },
    { href: "/admin/sellers", label: t({ de: "Verkäufer prüfen", en: "Review sellers" }) },
    { href: "/admin/auctions", label: t({ de: "Auktionen überwachen", en: "Monitor auctions" }) },
    { href: "/admin/features", label: t({ de: "Funktionen schalten", en: "Switch features" }) },
    { href: "/admin/inventory", label: t({ de: "Lager prüfen", en: "Check inventory" }) },
    { href: "/admin/reports", label: t({ de: "Berichte öffnen", en: "Open reports" }) },
  ];

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Dashboard", en: "Dashboard" })}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t({ de: "Übersicht", en: "Overview" })}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{t({ de: "Vorschau der Super-Admin-Oberfläche mit Beispieldaten. Keine API-Verbindung.", en: "Preview of the Super Admin interface with sample data. No API connection." })}</p>
        </div>
        <ButtonLink href="/admin/features" variant="secondary">{t({ de: "Funktionen", en: "Features" })}</ButtonLink>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href} className="rounded-3xl border border-line bg-white p-5 shadow-[0_12px_28px_-22px_rgba(18,18,18,0.45)] transition hover:-translate-y-0.5 hover:border-copper/40">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ de: "Letzte Aktivität", en: "Recent activity" })}</h2>
          <ul className="mt-4 divide-y divide-line">
            {activity.map((item) => (
              <li key={item.text}>
                <Link href={item.href} className="flex flex-col gap-1 py-3 text-sm transition hover:text-copper sm:flex-row sm:items-center sm:justify-between">
                  <span>{item.text}</span>
                  <span className="text-xs text-muted">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>
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
