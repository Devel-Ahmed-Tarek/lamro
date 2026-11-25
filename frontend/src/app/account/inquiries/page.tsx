"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { fetchMyInquiries, type ApiInquiry } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function InquiriesPage() {
  const { t, authUser, locale } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authUser) return;
    fetchMyInquiries()
      .then((response) => setItems(response.data.filter((item) => item.type !== "contact")))
      .catch(() => undefined);
  }, [authUser]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Artikelanfragen", en: "Product inquiries" })}</h1>
      <div className="mt-6">
        <DataTable
          rows={items.filter((item) => !hidden.has(item.id))}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.message} ${row.type} ${row.product ? t(row.product.name) : ""}`}
          onEdit={() => {
            window.location.href = "/account/messages";
          }}
          editLabel={{ de: "Nachrichten", en: "Messages" }}
          onDelete={async (row) => setHidden((current) => new Set(current).add(row.id))}
          onBulkDelete={async (rows) => {
            setHidden((current) => {
              const next = new Set(current);
              rows.forEach((row) => next.add(row.id));
              return next;
            });
          }}
          columns={[
            {
              id: "product",
              header: { de: "Artikel", en: "Product" },
              sort: "alpha",
              getValue: (row) => (row.product ? t(row.product.name) : row.message),
              cell: (row) => (row.product ? t(row.product.name) : row.message.slice(0, 80)),
            },
            {
              id: "type",
              header: { de: "Typ", en: "Type" },
              sort: "alpha",
              getValue: (row) => row.type,
              cell: (row) => row.type,
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
