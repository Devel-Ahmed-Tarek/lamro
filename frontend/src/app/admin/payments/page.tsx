"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { formatMoney } from "@/lib/catalog";
import {
  adminFetchPayments,
  adminMarkPaymentFailed,
  adminMarkPaymentReceived,
  type ApiPayment,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function AdminPaymentsPage() {
  const { t, locale, can } = useStore();
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await adminFetchPayments();
    setPayments(response.data);
  }

  useEffect(() => {
    if (!can("admin.payments")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.payments")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Zahlungen", en: "Payments" })}</h1>
      <p className="mt-2 text-sm text-muted">{t({ de: "Banküberweisungen manuell bestätigen. Kein endgültiges Löschen.", en: "Confirm bank transfers manually. No hard delete." })}</p>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={payments}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.reference ?? ""} ${row.order_id} ${row.status}`}
          onEdit={async (row) => {
            if (row.status !== "pending") return;
            await adminMarkPaymentReceived(row.id);
            setNotice(t({ de: "Zahlung als eingegangen markiert.", en: "Marked as received." }));
            await load();
          }}
          editLabel={{ de: "Eingang", en: "Received" }}
          onDelete={async (row) => {
            if (row.status !== "pending") return;
            await adminMarkPaymentFailed(row.id);
            setNotice(t({ de: "Zahlung als fehlgeschlagen markiert.", en: "Marked as failed." }));
            await load();
          }}
          onBulkDelete={async (rows) => {
            await Promise.all(rows.filter((row) => row.status === "pending").map((row) => adminMarkPaymentFailed(row.id)));
            setNotice(t({ de: "Auswahl als fehlgeschlagen markiert.", en: "Selection marked failed." }));
            await load();
          }}
          deleteLabel={{ de: "Als fehlgeschlagen markieren?", en: "Mark as failed?" }}
          bulkDeleteLabel={{ de: "Auswahl fehlgeschlagen", en: "Mark selected failed" }}
          rowDisabled={(row) => row.status !== "pending"}
          columns={[
            {
              id: "reference",
              header: { de: "Referenz", en: "Reference" },
              sort: "alpha",
              getValue: (row) => String(row.reference || row.order_id),
              cell: (row) => <span className="font-mono text-xs">{row.reference || row.order_id}</span>,
            },
            {
              id: "amount",
              header: { de: "Betrag", en: "Amount" },
              sort: "number",
              getValue: (row) => row.amount,
              cell: (row) => formatMoney(row.amount, locale),
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => row.status,
              cell: (row) => row.status,
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "date",
              getValue: (row) => row.created_at,
              cell: (row) => (row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—"),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
