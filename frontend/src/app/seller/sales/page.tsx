"use client";

import { Desk, useSellerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { useStore } from "@/lib/store";

type SaleRow = {
  id: number;
  title: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function SellerSalesPage() {
  const { t, locale } = useStore();
  const rows: SaleRow[] = [];

  return (
    <Desk title={t({ de: "Verkäufer", en: "Seller" })} items={useSellerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Verkäufe", en: "Sales" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Externe Partner-Verkäufe folgen in Kürze. Die Tabellenstruktur ist bereits vorbereitet.",
          en: "External partner sales come soon. The table structure is already ready.",
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
              id: "title",
              header: { de: "Artikel", en: "Item" },
              sort: "alpha",
              getValue: (row) => row.title,
              cell: (row) => row.title,
            },
            {
              id: "amount",
              header: { de: "Betrag", en: "Amount" },
              sort: "number",
              getValue: (row) => row.amount,
              cell: (row) => row.amount,
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
              cell: (row) => new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB"),
            },
          ]}
        />
      </div>
    </Desk>
  );
}
