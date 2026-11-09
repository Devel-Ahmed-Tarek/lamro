"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui";
import { formatMoney, type Copy } from "@/lib/catalog";
import {
  adminFetchOrders,
  adminRefundOrder,
  adminUpdateOrderStatus,
  type ApiOrder,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

function label(name: Copy | undefined, locale: "de" | "en") {
  if (!name) return "—";
  return name[locale] || name.en || name.de;
}

const STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
];

export default function AdminOrdersPage() {
  const { t, locale, can } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState("");
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
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  async function refund(order: ApiOrder) {
    if (!window.confirm(t({ de: "Volle Erstattung + Restock?", en: "Full refund + restock?" }))) return;
    setBusy(order.id);
    setError("");
    try {
      await adminRefundOrder(order.id, { restock: true, reason: "Admin refund" });
      await load();
    } catch {
      setError(t({ de: "Refund fehlgeschlagen.", en: "Refund failed." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Bestellungen", en: "Orders" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Kunde", en: "Customer" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Artikel", en: "Item" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Summe", en: "Total" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Status", en: "Status" })}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const canRefund =
                order.payment?.status === "received" &&
                order.status !== "refunded" &&
                (order.payment.refunded_cents ?? 0) < (order.payment.amount_cents ?? Math.round(order.payment.amount * 100));

              return (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-xs">{order.number}</td>
                  <td className="px-4 py-3">{order.user?.email ?? "—"}</td>
                  <td className="px-4 py-3">{label(order.items?.[0]?.name, locale)}</td>
                  <td className="px-4 py-3">{formatMoney(order.total, locale)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-line px-2 py-1"
                      value={order.status}
                      onChange={(event) => {
                        void adminUpdateOrderStatus(order.id, event.target.value)
                          .then(() => load())
                          .catch(() => setError("Status update failed"));
                      }}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {canRefund ? (
                      <Button size="sm" disabled={busy === order.id} onClick={() => void refund(order)}>
                        {t({ de: "Refund", en: "Refund" })}
                      </Button>
                    ) : order.status === "refunded" ? (
                      <span className="text-xs text-muted">refunded</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
