"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { formatMoney } from "@/lib/catalog";
import { adminGet } from "@/lib/platform-api";
import { apiUrl, getToken } from "@/lib/api";
import { useStore } from "@/lib/store";

type Report = {
  orders_total: number;
  orders_paid: number;
  revenue_cents: number;
  invoices: number;
  open_inquiries: number;
  customers: number;
  sales_split: { store: number; auction: number };
};

export default function AdminReportsPage() {
  const { t, locale, can } = useStore();
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    if (!can("admin.reports")) return;
    void adminGet<Report>("/api/v1/admin/reports").then((response) => setData((response as { data: Report }).data));
  }, [can]);

  if (!can("admin.reports")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Berichte", en: "Reports" })}</h1>
        <button
          type="button"
          className="text-sm text-copper"
          onClick={() => {
            void fetch(`${apiUrl()}/api/v1/admin/reports/export`, { headers: { Authorization: `Bearer ${getToken()}` } })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "jala-orders.csv";
                a.click();
                URL.revokeObjectURL(url);
              });
          }}
        >
          Export CSV
        </button>
      </div>
      {data ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [t({ de: "Bestellungen", en: "Orders" }), String(data.orders_total)],
            [t({ de: "Bezahlt", en: "Paid" }), String(data.orders_paid)],
            [t({ de: "Umsatz", en: "Revenue" }), formatMoney(data.revenue_cents / 100, locale)],
            [t({ de: "Rechnungen", en: "Invoices" }), String(data.invoices)],
            [t({ de: "Offene Anfragen", en: "Open inquiries" }), String(data.open_inquiries)],
            [t({ de: "Kunden", en: "Customers" }), String(data.customers)],
            ["Store", formatMoney(data.sales_split.store / 100, locale)],
            ["Auction", formatMoney(data.sales_split.auction / 100, locale)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2 text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </AdminShell>
  );
}
