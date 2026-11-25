"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import {
  adminFetchReturns,
  adminUpdateReturnStatus,
  type ApiOrderReturn,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

const STATUS_LABELS: Record<string, { de: string; en: string }> = {
  approved: { de: "genehmigt", en: "approved" },
  rejected: { de: "abgelehnt", en: "rejected" },
  returned: { de: "zurückerhalten", en: "returned" },
  refunded: { de: "erstattet", en: "refunded" },
  requested: { de: "beantragt", en: "requested" },
};

export default function AdminReturnsPage() {
  const { t, can, locale } = useStore();
  const [items, setItems] = useState<ApiOrderReturn[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await adminFetchReturns();
    setItems(response.data);
  }

  useEffect(() => {
    if (!can("admin.orders")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.orders")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Retouren", en: "Returns" })}</h1>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={items}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.order?.number ?? row.order_id} ${row.user?.email ?? ""} ${row.reason} ${row.status}`}
          onEdit={async (row) => {
            await adminUpdateReturnStatus(row.id, "approved");
            setNotice(t({ de: "Retoure genehmigt.", en: "Return approved." }));
            await load();
          }}
          editLabel={{ de: "Genehmigen", en: "Approve" }}
          onDelete={async (row) => {
            await adminUpdateReturnStatus(row.id, "rejected");
            setNotice(t({ de: "Retoure abgelehnt.", en: "Return rejected." }));
            await load();
          }}
          onBulkDelete={async (rows) => {
            await Promise.all(rows.map((row) => adminUpdateReturnStatus(row.id, "rejected")));
            setNotice(t({ de: "Auswahl abgelehnt.", en: "Selection rejected." }));
            await load();
          }}
          deleteLabel={{ de: "Ablehnen?", en: "Reject?" }}
          bulkDeleteLabel={{ de: "Auswahl ablehnen", en: "Reject selected" }}
          rowDisabled={(row) => row.status === "refunded" || row.status === "rejected"}
          columns={[
            {
              id: "order",
              header: { de: "Auftrag", en: "Order" },
              sort: "alpha",
              getValue: (row) => String(row.order?.number ?? row.order_id),
              cell: (row) => <span className="font-mono text-xs">{row.order?.number ?? row.order_id}</span>,
            },
            {
              id: "customer",
              header: { de: "Kunde", en: "Customer" },
              sort: "alpha",
              getValue: (row) => row.user?.email ?? "",
              cell: (row) => row.user?.email ?? "—",
            },
            {
              id: "reason",
              header: { de: "Grund", en: "Reason" },
              sort: "alpha",
              getValue: (row) => row.reason,
              cell: (row) => (
                <div>
                  <div>{row.reason}</div>
                  {row.message ? <div className="mt-1 text-xs text-muted">{row.message}</div> : null}
                </div>
              ),
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => row.status,
              cell: (row) => t(STATUS_LABELS[row.status] ?? { de: row.status, en: row.status }),
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
