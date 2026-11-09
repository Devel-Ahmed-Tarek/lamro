"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Notice } from "@/components/ui";
import { formatMoney, type Copy } from "@/lib/catalog";
import { downloadInvoice, fetchMyOrders, startStripeCheckout, type ApiOrder } from "@/lib/commerce-api";
import { cancelOrder } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

function itemLabel(name: Copy, locale: "de" | "en") {
  return name?.[locale] || name?.en || name?.de || "—";
}

export default function OrdersPage() {
  const { t, locale, authUser } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    fetchMyOrders()
      .then((response) => setOrders(response.data))
      .catch(() => setError(t({ de: "Bestellungen nicht geladen.", en: "Could not load orders." })));
  }, [authUser, t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Bestellungen", en: "Orders" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {orders.length === 0 ? (
        <div className="mt-6"><Notice>{t({ de: "Noch keine Bestellungen.", en: "No orders yet." })}</Notice></div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid gap-2 border-b border-line px-4 py-3 text-sm sm:grid-cols-4">
                <span className="font-mono">{order.number}</span>
                <span>{order.items?.[0] ? itemLabel(order.items[0].name, locale) : order.source}</span>
                <span>{order.status}</span>
                <span className="text-muted">{formatMoney(order.total, locale)}</span>
              </div>
              <div className="flex flex-wrap gap-4 px-4 py-3 text-sm">
                {order.invoice ? (
                  <button type="button" className="text-copper" onClick={() => void downloadInvoice(order.invoice!.id)}>
                    {t({ de: "Rechnung PDF", en: "Invoice PDF" })}
                  </button>
                ) : (
                  <span className="text-muted">{t({ de: "Rechnung nach Zahlung", en: "Invoice after payment" })}</span>
                )}
                {order.tracking_number ? <span className="text-muted">Tracking: {order.tracking_number}</span> : null}
                {order.status === "pending_payment" ? (
                  <button
                    type="button"
                    className="text-copper"
                    onClick={() => void startStripeCheckout(order.id)
                      .then((response) => {
                        if (response.data.checkout_url) window.location.href = response.data.checkout_url;
                      })
                      .catch(() => setError("Stripe start failed"))}
                  >
                    {t({ de: "Mit Stripe zahlen", en: "Pay with Stripe" })}
                  </button>
                ) : null}
                {["pending_payment", "paid", "processing"].includes(order.status) ? (
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => void cancelOrder(order.id).then(() => fetchMyOrders().then((response) => setOrders(response.data))).catch(() => setError("Cancel failed"))}
                  >
                    {t({ de: "Stornieren", en: "Cancel" })}
                  </button>
                ) : null}
                {order.payment ? <span className="text-muted">{order.payment.method}: {order.payment.status}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Desk>
  );
}
