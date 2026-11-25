"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui";
import { formatMoney, pickCopy, type Copy } from "@/lib/catalog";
import {
  adminFetchOrders,
  adminRefundOrder,
  adminUpdateOrderStatus,
  type ApiOrder,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

const STATUS_LABELS: Record<string, { de: string; en: string }> = {
  pending_payment: { de: "Zahlung ausstehend", en: "pending payment" },
  paid: { de: "Bezahlt", en: "paid" },
  processing: { de: "In Bearbeitung", en: "processing" },
  shipped: { de: "Versendet", en: "shipped" },
  delivered: { de: "Zugestellt", en: "delivered" },
  cancelled: { de: "Storniert", en: "cancelled" },
  return_requested: { de: "Retoure beantragt", en: "return requested" },
  returned: { de: "Retourniert", en: "returned" },
  refunded: { de: "Erstattet", en: "refunded" },
};

const STATUSES = Object.keys(STATUS_LABELS);

export default function AdminOrdersPage() {
  const { t, locale, can } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await adminFetchOrders();
    setOrders(response.data);
  }

  useEffect(() => {
    if (!can("admin.orders")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.orders")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  async function refund(order: ApiOrder) {
    if (!window.confirm(t({ de: "Volle Erstattung und Rückbuchung ins Lager?", en: "Full refund + restock?" }))) return;
    setBusy(order.id);
    setError("");
    try {
      await adminRefundOrder(order.id, { restock: true, reason: "Admin refund" });
      setNotice(t({ de: "Erstattung ausgeführt.", en: "Refund completed." }));
      await load();
    } catch {
      setError(t({ de: "Erstattung fehlgeschlagen.", en: "Refund failed." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Bestellungen", en: "Orders" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Finanzdaten werden nicht endgültig gelöscht — Stornieren archiviert den Vorgang.",
          en: "Financial records are not hard-deleted — cancel archives the order.",
        })}
      </p>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={orders}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.number} ${row.user?.email ?? ""} ${row.status}`}
          onEdit={(row) => {
            const next = window.prompt(
              t({ de: "Neuer Status", en: "New status" }) + `: ${STATUSES.join(", ")}`,
              row.status,
            );
            if (!next || !STATUS_LABELS[next]) return;
            void adminUpdateOrderStatus(row.id, next)
              .then(() => {
                setNotice(t({ de: "Status aktualisiert.", en: "Status updated." }));
                return load();
              })
              .catch(() => setError(t({ de: "Statusaktualisierung fehlgeschlagen.", en: "Status update failed." })));
          }}
          editLabel={{ de: "Status", en: "Status" }}
          onDelete={async (row) => {
            await adminUpdateOrderStatus(row.id, "cancelled");
            setNotice(t({ de: "Bestellung storniert.", en: "Order cancelled." }));
            await load();
          }}
          onBulkDelete={async (rows) => {
            await Promise.all(rows.map((row) => adminUpdateOrderStatus(row.id, "cancelled")));
            setNotice(t({ de: "Auswahl storniert.", en: "Selection cancelled." }));
            await load();
          }}
          deleteLabel={{ de: "Stornieren?", en: "Cancel order?" }}
          bulkDeleteLabel={{ de: "Auswahl stornieren", en: "Cancel selected" }}
          columns={[
            {
              id: "number",
              header: "#",
              sort: "alpha",
              getValue: (row) => row.number,
              cell: (row) => <span className="font-mono text-xs">{row.number}</span>,
            },
            {
              id: "customer",
              header: { de: "Kunde", en: "Customer" },
              sort: "alpha",
              getValue: (row) => row.user?.email ?? "",
              cell: (row) => row.user?.email ?? "—",
            },
            {
              id: "item",
              header: { de: "Artikel", en: "Item" },
              sort: "alpha",
              getValue: (row) => (row.items?.[0]?.name ? pickCopy(row.items[0].name as Copy, locale) : ""),
              cell: (row) => (row.items?.[0]?.name ? pickCopy(row.items[0].name as Copy, locale) : "—"),
            },
            {
              id: "total",
              header: { de: "Summe", en: "Total" },
              sort: "number",
              getValue: (row) => row.total,
              cell: (row) => formatMoney(row.total, locale),
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
          extraActions={(row) => {
            const canRefund =
              row.payment?.status === "received" &&
              row.status !== "refunded" &&
              (row.payment.refunded_cents ?? 0) < (row.payment.amount_cents ?? Math.round(row.payment.amount * 100));
            if (!canRefund) return null;
            return (
              <Button size="sm" disabled={busy === row.id} onClick={() => void refund(row)}>
                {t({ de: "Erstatten", en: "Refund" })}
              </Button>
            );
          }}
        />
      </div>
    </AdminShell>
  );
}
