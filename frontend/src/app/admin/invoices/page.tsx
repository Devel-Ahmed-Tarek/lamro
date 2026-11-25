"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { formatMoney } from "@/lib/catalog";
import { adminFetchInvoices, downloadInvoice, type ApiInvoice } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function AdminInvoicesPage() {
  const { t, locale, can } = useStore();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!can("admin.invoices")) return;
    adminFetchInvoices()
      .then((response) => setInvoices(response.data))
      .catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.invoices")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  const visible = invoices.filter((item) => !hidden.has(item.id));

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Rechnungen", en: "Invoices" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Rechnungen werden nicht gelöscht — nur aus der aktuellen Ansicht ausgeblendet.",
          en: "Invoices are not deleted — only hidden from the current view.",
        })}
      </p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={visible}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.number} ${row.order?.number ?? row.order_id}`}
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
              id: "order",
              header: { de: "Auftrag", en: "Order" },
              sort: "alpha",
              getValue: (row) => String(row.order?.number ?? row.order_id),
              cell: (row) => <span className="font-mono text-xs">{row.order?.number ?? row.order_id}</span>,
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
    </AdminShell>
  );
}
