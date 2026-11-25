"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
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
  created_at?: string | null;
};

export default function InventoryPage() {
  const { t, can, locale } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  async function load() {
    const response = await adminFetchInventory();
    setRows(response.data as Row[]);
  }

  useEffect(() => {
    if (!can("admin.inventory")) return;
    load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.inventory")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  const visible = rows.filter((row) => !hidden.has(row.id));

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Lager", en: "Inventory" })}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        {t({
          de: "Frei = Gesamt − Auktion reserviert − Auftrag reserviert. Bearbeiten setzt den Gesamtbestand.",
          en: "Available = total − auction reserved − order reserved. Edit sets total stock.",
        })}
      </p>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={visible}
          rowKey={(row) => row.id}
          defaultSortId="name"
          getSearchText={(row) => `${t(row.name)} ${row.part_number ?? ""} ${row.slug}`}
          onEdit={async (row) => {
            const value = Number(drafts[row.id] ?? row.total_stock);
            await adminAdjustStock(row.id, value);
            setNotice(t({ de: "Bestand angepasst.", en: "Stock adjusted." }));
            await load();
          }}
          editLabel={{ de: "Bestand speichern", en: "Save stock" }}
          onDelete={async (row) => {
            setHidden((current) => new Set(current).add(row.id));
          }}
          onBulkDelete={async (selected) => {
            setHidden((current) => {
              const next = new Set(current);
              selected.forEach((row) => next.add(row.id));
              return next;
            });
          }}
          deleteLabel={{ de: "Aus Ansicht ausblenden?", en: "Hide from view?" }}
          bulkDeleteLabel={{ de: "Auswahl ausblenden", en: "Hide selected" }}
          columns={[
            {
              id: "name",
              header: { de: "Artikel", en: "Item" },
              sort: "alpha",
              getValue: (row) => t(row.name),
              cell: (row) => (
                <div>
                  <div>{t(row.name)}</div>
                  <div className="font-mono text-xs text-muted">{row.part_number || row.slug}</div>
                </div>
              ),
            },
            {
              id: "total",
              header: { de: "Gesamt", en: "Total" },
              sort: "number",
              getValue: (row) => row.total_stock,
              cell: (row) => (
                <input
                  className={`${fieldClass} w-20`}
                  value={drafts[row.id] ?? String(row.total_stock)}
                  onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                />
              ),
            },
            {
              id: "auction",
              header: { de: "Auktion", en: "Auction" },
              sort: "number",
              getValue: (row) => row.reserved_auction,
              cell: (row) => row.reserved_auction,
            },
            {
              id: "order",
              header: { de: "Auftrag", en: "Order" },
              sort: "number",
              getValue: (row) => row.reserved_order,
              cell: (row) => row.reserved_order,
            },
            {
              id: "available",
              header: { de: "Frei", en: "Available" },
              sort: "number",
              getValue: (row) => row.available_stock,
              cell: (row) => row.available_stock,
            },
            {
              id: "sold",
              header: { de: "Verkauft", en: "Sold" },
              sort: "number",
              getValue: (row) => row.sold_quantity ?? 0,
              cell: (row) => row.sold_quantity ?? 0,
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
    </AdminShell>
  );
}
