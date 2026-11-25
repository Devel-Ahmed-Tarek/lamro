"use client";

import { FormEvent, useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchMyOrders, fetchMyReturns, type ApiOrder, type ApiOrderReturn } from "@/lib/commerce-api";
import { requestReturn } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

const RETURNABLE = ["paid", "processing", "shipped", "delivered"];

export default function ReturnsPage() {
  const { t, authUser, locale } = useStore();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [returns, setReturns] = useState<ApiOrderReturn[]>([]);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<Set<number>>(new Set());

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
      <div className="mt-4">
        <DataTable
          rows={returns.filter((item) => !hidden.has(item.id))}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.order?.number ?? row.order_id} ${row.reason} ${row.status}`}
          onEdit={() => undefined}
          editLabel={{ de: "Details", en: "Details" }}
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
              id: "order",
              header: { de: "Auftrag", en: "Order" },
              sort: "alpha",
              getValue: (row) => String(row.order?.number ?? row.order_id),
              cell: (row) => <span className="font-mono text-xs">{row.order?.number ?? row.order_id}</span>,
            },
            {
              id: "reason",
              header: { de: "Grund", en: "Reason" },
              sort: "alpha",
              getValue: (row) => row.reason,
              cell: (row) => (
                <div>
                  <div>{row.reason}</div>
                  {row.admin_note ? <div className="mt-1 text-xs text-muted">{row.admin_note}</div> : null}
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
