"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { formatMoney, pickCopy, type Copy } from "@/lib/catalog";
import { downloadInvoice, fetchMyOrders, startStripeCheckout, type ApiOrder } from "@/lib/commerce-api";
import { cancelOrder } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function OrdersPage() {
  const { t, locale, authUser } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetchMyOrders();
    setOrders(response.data);
  }

  useEffect(() => {
    if (!authUser) return;
    load().catch(() => setError(t({ de: "Bestellungen nicht geladen.", en: "Could not load orders." })));
  }, [authUser, t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Bestellungen", en: "Orders" })}</h1>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={orders}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.number} ${row.status} ${row.items?.[0]?.name ? pickCopy(row.items[0].name as Copy, locale) : ""}`}
          onEdit={(row) => {
            if (row.invoice) void downloadInvoice(row.invoice.id);
            else if (row.status === "pending_payment") {
              void startStripeCheckout(row.id)
                .then((response) => {
                  if (response.data.checkout_url) window.location.href = response.data.checkout_url;
                })
                .catch(() => setError(t({ de: "Stripe Start fehlgeschlagen.", en: "Stripe start failed." })));
            }
          }}
          editLabel={{ de: "Öffnen / Zahlen", en: "Open / Pay" }}
          onDelete={async (row) => {
            await cancelOrder(row.id);
            setNotice(t({ de: "Bestellung storniert.", en: "Order cancelled." }));
            await load();
          }}
          onBulkDelete={async (rows) => {
            await Promise.all(
              rows
                .filter((row) => ["pending_payment", "paid", "processing"].includes(row.status))
                .map((row) => cancelOrder(row.id)),
            );
            setNotice(t({ de: "Auswahl storniert.", en: "Selection cancelled." }));
            await load();
          }}
          deleteLabel={{ de: "Stornieren?", en: "Cancel?" }}
          bulkDeleteLabel={{ de: "Auswahl stornieren", en: "Cancel selected" }}
          rowDisabled={(row) => !["pending_payment", "paid", "processing"].includes(row.status)}
          columns={[
            {
              id: "number",
              header: "#",
              sort: "alpha",
              getValue: (row) => row.number,
              cell: (row) => <span className="font-mono text-xs">{row.number}</span>,
            },
            {
              id: "item",
              header: { de: "Artikel", en: "Item" },
              sort: "alpha",
              getValue: (row) => (row.items?.[0]?.name ? pickCopy(row.items[0].name as Copy, locale) : row.source),
              cell: (row) => (row.items?.[0]?.name ? pickCopy(row.items[0].name as Copy, locale) : row.source),
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => row.status,
              cell: (row) => row.status,
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
              getValue: (row) => row.created_at,
              cell: (row) => (row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—"),
            },
          ]}
        />
      </div>
    </Desk>
  );
}
