"use client";

import { Desk, useCustomerNav } from "@/components/desk";
import { useStore } from "@/lib/store";

export default function AccountPage() {
  const { t } = useStore();
  const items = [
    [t({ de: "Offene Bestellungen", en: "Open orders" }), "1"],
    [t({ de: "Laufende Gebote", en: "Active bids" }), "2"],
    [t({ de: "Ungelesene Nachrichten", en: "Unread messages" }), "1"],
  ];
  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Guten Tag.", en: "Hello." })}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
    </Desk>
  );
}
