"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fieldClass } from "@/components/ui";
import type { Copy } from "@/lib/catalog";
import { adminAdjustStock, adminFetchInventory } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

type Row = {
  id: number;
  slug: string;
  name: Copy;
  total_stock: number;
  reserved_auction: number;
  reserved_order: number;
  available_stock: number;
  sold_quantity: number;
  part_number?: string | null;
};

export default function InventoryPage() {
  const { t, locale, can } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const response = await adminFetchInventory();
    setRows(response.data as Row[]);
  }

  useEffect(() => {
    if (!can("admin.inventory")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.inventory")) {
    return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Lager", en: "Inventory" })}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        {t({
          de: "Frei = Gesamt − Auktion reserviert − Auftrag reserviert.",
          en: "Available = total − auction reserved − order reserved.",
        })}
      </p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t({ de: "Artikel", en: "Item" })}</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Auktion", en: "Auction" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Auftrag", en: "Order" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Frei", en: "Available" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Verkauft", en: "Sold" })}</th>
              <th className="px-4 py-3 font-medium">{t({ de: "Anpassen", en: "Adjust" })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div>{locale === "de" ? row.name.de : row.name.en}</div>
                  <div className="font-mono text-xs text-muted">{row.part_number || row.slug}</div>
                </td>
                <td className="px-4 py-3">{row.total_stock}</td>
                <td className="px-4 py-3">{row.reserved_auction}</td>
                <td className="px-4 py-3">{row.reserved_order}</td>
                <td className="px-4 py-3">{row.available_stock}</td>
                <td className="px-4 py-3">{row.sold_quantity ?? 0}</td>
                <td className="px-4 py-3">
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = Number(drafts[row.id] ?? row.total_stock);
                      void adminAdjustStock(row.id, value)
                        .then(() => load())
                        .catch(() => setError("Adjust failed"));
                    }}
                  >
                    <input
                      className={`${fieldClass} w-20`}
                      value={drafts[row.id] ?? String(row.total_stock)}
                      onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                    />
                    <button className="rounded-lg bg-ink px-2 text-xs text-paper" type="submit">OK</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
