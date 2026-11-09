"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { formatMoney } from "@/lib/catalog";
import { adminFetchInvoices, downloadInvoice, type ApiInvoice } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function AdminInvoicesPage() {
  const { t, locale, can } = useStore();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!can("admin.invoices")) return;
    adminFetchInvoices()
      .then((response) => setInvoices(response.data))
      .catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.invoices")) {
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Rechnungen", en: "Invoices" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Auftrag", en: "Order" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Summe", en: "Total" })}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-line">
                <td className="px-4 py-3 font-mono text-xs">{invoice.number}</td>
                <td className="px-4 py-3 font-mono text-xs">{invoice.order?.number ?? invoice.order_id}</td>
                <td className="px-4 py-3">{formatMoney(invoice.total, locale)}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-copper" onClick={() => void downloadInvoice(invoice.id)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
