"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { fetchMyInquiries, type ApiInquiry } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function MessagesPage() {
  const { t, authUser, locale } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authUser) return;
    fetchMyInquiries()
      .then((response) => setItems(response.data))
      .catch(() => setError(t({ de: "Nachrichten nicht geladen.", en: "Could not load messages." })));
  }, [authUser, t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Nachrichten", en: "Messages" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={items.filter((item) => !hidden.has(item.id))}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.message} ${row.type} ${row.status} ${row.product ? t(row.product.name) : ""}`}
          onEdit={(row) => {
            if (row.product?.slug) window.location.href = `/store/${row.product.slug}`;
          }}
          editLabel={{ de: "Artikel öffnen", en: "Open product" }}
          onDelete={async (row) => setHidden((current) => new Set(current).add(row.id))}
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
              id: "type",
              header: { de: "Typ", en: "Type" },
              sort: "alpha",
              getValue: (row) => row.type,
              cell: (row) => <span className="font-mono text-xs">{row.type}</span>,
            },
            {
              id: "message",
              header: { de: "Nachricht", en: "Message" },
              sort: "alpha",
              getValue: (row) => row.message,
              cell: (row) => (
                <div>
                  <p>{row.message}</p>
                  {row.admin_reply ? (
                    <p className="mt-1 text-xs text-muted">Jala: {row.admin_reply}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{t({ de: "Wartet auf Antwort.", en: "Waiting for a reply." })}</p>
                  )}
                </div>
              ),
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
    </Desk>
  );
}
