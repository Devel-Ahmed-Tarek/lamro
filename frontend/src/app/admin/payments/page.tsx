"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui";
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
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await adminFetchPayments();
    setPayments(response.data);
  }

  useEffect(() => {
    if (!can("admin.payments")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.payments")) {
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  async function mark(id: number, ok: boolean) {
    setBusy(id);
    setError("");
    try {
      if (ok) await adminMarkPaymentReceived(id);
      else await adminMarkPaymentFailed(id);
      await load();
    } catch {
      setError(t({ de: "Aktion fehlgeschlagen.", en: "Action failed." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Zahlungen", en: "Payments" })}</h1>
      <p className="mt-2 text-sm text-muted">{t({ de: "Banküberweisungen manuell bestätigen.", en: "Confirm bank transfers manually." })}</p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t({ de: "Referenz", en: "Reference" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Betrag", en: "Amount" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Status", en: "Status" })}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-line">
                <td className="px-4 py-3 font-mono text-xs">{payment.reference || payment.order_id}</td>
                <td className="px-4 py-3">
                  {formatMoney(payment.amount, locale)}
                  {(payment.refunded_cents ?? 0) > 0 ? (
                    <span className="ml-2 text-xs text-muted">
                      (−{formatMoney(payment.refunded ?? payment.refunded_cents! / 100, locale)})
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{payment.status}</td>
                <td className="px-4 py-3">
                  {payment.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy === payment.id} onClick={() => void mark(payment.id, true)}>
                        {t({ de: "Eingang", en: "Received" })}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy === payment.id} onClick={() => void mark(payment.id, false)}>
                        {t({ de: "Fehlgeschlagen", en: "Failed" })}
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
