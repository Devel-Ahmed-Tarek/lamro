"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { formatMoney } from "@/lib/catalog";
import { downloadInvoice, fetchMyInvoices, type ApiInvoice } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function InvoicesPage() {
  const { t, locale, authUser } = useStore();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authUser) return;
    fetchMyInvoices()
      .then((response) => setInvoices(response.data))
      .catch(() => setError(t({ de: "Rechnungen nicht geladen.", en: "Could not load invoices." })));
  }, [authUser, t]);

  const visible = invoices.filter((item) => !hidden.has(item.id));

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Rechnungen", en: "Invoices" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={visible}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => row.number}
          onEdit={(row) => void downloadInvoice(row.id)}
          editLabel={{ de: "Herunterladen", en: "Download" }}
          onDelete={async (row) => {
            setHidden((current) => new Set(current).add(row.id));
          }}
          onBulkDelete={async (rows) => {
            setHidden((current) => {
              const next = new Set(current);
              rows.forEach((row) => next.add(row.id));
              return next;
            });
          }}
          deleteLabel={{ de: "Aus Ansicht ausblenden?", en: "Hide from view?" }}
          bulkDeleteLabel={{ de: "Auswahl ausblenden", en: "Hide selected" }}
          columns={[
            {
              id: "number",
              header: "#",
              sort: "alpha",
              getValue: (row) => row.number,
              cell: (row) => <span className="font-mono text-xs">{row.number}</span>,
            },
            {
              id: "total",
              header: { de: "Summe", en: "Total" },
              sort: "number",
              getValue: (row) => row.total,
              cell: (row) => formatMoney(row.total, locale),
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "date",
              getValue: (row) => row.created_at ?? row.issued_at,
              cell: (row) => {
                const value = row.created_at ?? row.issued_at;
                return value ? new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—";
              },
            },
          ]}
        />
      </div>
    </Desk>
  );
}
