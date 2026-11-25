"use client";

import { Desk, useSellerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { useStore } from "@/lib/store";

type CommissionRow = {
  id: number;
  label: string;
  amount: number;
  created_at: string;
};

export default function SellerCommissionsPage() {
  const { t, locale } = useStore();
  const rows: CommissionRow[] = [];

  return (
    <Desk title={t({ de: "Verkäufer", en: "Seller" })} items={useSellerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Provisionen", en: "Commissions" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Provisionen folgen mit dem Partner-Modul. Die Tabelle ist bereits vorbereitet.",
          en: "Commissions ship with the partner module. The table is already prepared.",
        })}
      </p>
      <div className="mt-6">
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          onEdit={() => undefined}
          onDelete={async () => undefined}
          onBulkDelete={async () => undefined}
          columns={[
            {
              id: "label",
              header: { de: "Bezeichnung", en: "Label" },
              sort: "alpha",
              getValue: (row) => row.label,
              cell: (row) => row.label,
            },
            {
              id: "amount",
              header: { de: "Betrag", en: "Amount" },
              sort: "number",
              getValue: (row) => row.amount,
              cell: (row) => row.amount,
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "date",
              getValue: (row) => row.created_at,
              cell: (row) => new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB"),
            },
          ]}
        />
      </div>
    </Desk>
  );
}
