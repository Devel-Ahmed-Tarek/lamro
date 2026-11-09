"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui";
import {
  adminFetchReturns,
  adminUpdateReturnStatus,
  type ApiOrderReturn,
} from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

const ACTIONS = ["approved", "rejected", "returned", "refunded"] as const;

export default function AdminReturnsPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<ApiOrderReturn[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await adminFetchReturns();
    setItems(response.data);
  }

  useEffect(() => {
    if (!can("admin.orders")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.orders")) {
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  async function act(id: number, status: string) {
    setBusy(id);
    setError("");
    try {
      await adminUpdateReturnStatus(id, status, undefined, status === "refunded");
      await load();
    } catch {
      setError(t({ de: "Aktion fehlgeschlagen.", en: "Action failed." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Retouren", en: "Returns" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Genehmigen, Wareneingang, Refund + Restock.",
          en: "Approve, receive goods, refund + restock.",
        })}
      </p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t({ de: "Auftrag", en: "Order" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Kunde", en: "Customer" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Grund", en: "Reason" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Status", en: "Status" })}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {t({ de: "Keine Retouren.", en: "No returns." })}
                </td>
              </tr>
            ) : null}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-mono text-xs">{item.order?.number ?? item.order_id}</td>
                <td className="px-4 py-3">{item.user?.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div>{item.reason}</div>
                  {item.message ? <div className="mt-1 text-xs text-muted">{item.message}</div> : null}
                </td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">
                  {item.status === "refunded" || item.status === "rejected" ? null : (
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.filter((status) => status !== item.status).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={status === "refunded" ? "primary" : "secondary"}
                          disabled={busy === item.id}
                          onClick={() => void act(item.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
