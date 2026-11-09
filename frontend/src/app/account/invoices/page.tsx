"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Notice } from "@/components/ui";
import { formatMoney } from "@/lib/catalog";
import { downloadInvoice, fetchMyInvoices, type ApiInvoice } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function InvoicesPage() {
  const { t, locale, authUser } = useStore();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    fetchMyInvoices()
      .then((response) => setInvoices(response.data))
      .catch(() => setError(t({ de: "Rechnungen nicht geladen.", en: "Could not load invoices." })));
  }, [authUser, t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Rechnungen", en: "Invoices" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {invoices.length === 0 ? (
        <div className="mt-6"><Notice>{t({ de: "Keine Rechnungen.", en: "No invoices." })}</Notice></div>
      ) : (
        <div className="mt-6 space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-4 text-sm">
              <span className="font-mono">{invoice.number} · {formatMoney(invoice.total, locale)}</span>
              <button type="button" className="text-copper" onClick={() => void downloadInvoice(invoice.id)}>
                {t({ de: "Download", en: "Download" })}
              </button>
            </div>
          ))}
        </div>
      )}
    </Desk>
  );
}
