"use client";

import { FormEvent, useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchMyOrders, fetchMyReturns, type ApiOrder, type ApiOrderReturn } from "@/lib/commerce-api";
import { requestReturn } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

const RETURNABLE = ["paid", "processing", "shipped", "delivered"];

export default function ReturnsPage() {
  const { t, authUser } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [returns, setReturns] = useState<ApiOrderReturn[]>([]);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [orderRes, returnRes] = await Promise.all([fetchMyOrders(), fetchMyReturns()]);
    setOrders(orderRes.data.filter((order) => RETURNABLE.includes(order.status)));
    setReturns(returnRes.data);
  }

  useEffect(() => {
    if (!authUser) return;
    void load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [authUser, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orderId = Number(form.get("order_id"));
    setError("");
    setSent("");
    try {
      await requestReturn(orderId, String(form.get("reason") || ""), String(form.get("message") || ""));
      setSent(t({ de: "Retoure angefragt.", en: "Return requested." }));
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Fehler.", en: "Error." }));
    }
  }

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Retouren und Reklamationen", en: "Returns and complaints" })}</h1>

      <form className="mt-6 max-w-lg space-y-4" onSubmit={onSubmit}>
        <Field label={t({ de: "Bestellung", en: "Order" })}>
          <select name="order_id" required className={fieldClass} defaultValue="">
            <option value="" disabled>{t({ de: "Wählen", en: "Select" })}</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>{order.number} · {order.status}</option>
            ))}
          </select>
        </Field>
        <Field label={t({ de: "Grund", en: "Reason" })}>
          <input name="reason" required className={fieldClass} />
        </Field>
        <Field label={t({ de: "Nachricht", en: "Message" })}>
          <textarea name="message" rows={4} className={fieldClass} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {sent ? <p className="text-sm text-moss">{sent}</p> : null}
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
          {t({ de: "Retoure öffnen", en: "Open return" })}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">{t({ de: "Meine Retouren", en: "My returns" })}</h2>
      <div className="mt-4 space-y-3">
        {returns.length === 0 ? (
          <p className="text-sm text-muted">{t({ de: "Noch keine Retouren.", en: "No returns yet." })}</p>
        ) : (
          returns.map((item) => (
            <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
              <div className="flex flex-wrap gap-3">
                <span className="font-mono text-xs">{item.order?.number ?? item.order_id}</span>
                <span>{item.status}</span>
                <span className="text-muted">{item.reason}</span>
              </div>
              {item.admin_note ? <p className="mt-2 text-muted">{item.admin_note}</p> : null}
            </div>
          ))
        )}
      </div>
    </Desk>
  );
}
