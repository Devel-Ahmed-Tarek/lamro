"use client";

import Link from "next/link";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { productBySlug, type Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function WatchPage() {
  const { t, watch, toggleWatch } = useStore();
  const items = watch.map((slug) => productBySlug(slug)).filter(Boolean) as Product[];

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Merkliste", en: "Watchlist" })}</h1>
      <div className="mt-6">
        <DataTable
          rows={items}
          rowKey={(row) => row.slug}
          defaultSortId="name"
          getSearchText={(row) => `${t(row.name)} ${row.slug}`}
          onEdit={(row) => {
            window.location.href = `/store/${row.slug}`;
          }}
          editLabel={{ de: "Öffnen", en: "Open" }}
          onDelete={async (row) => {
            toggleWatch(row.slug);
          }}
          onBulkDelete={async (rows) => {
            rows.forEach((row) => toggleWatch(row.slug));
          }}
          columns={[
            {
              id: "name",
              header: { de: "Artikel", en: "Item" },
              sort: "alpha",
              getValue: (row) => t(row.name),
              cell: (row) => (
                <Link href={`/store/${row.slug}`} className="font-medium text-copper">
                  {t(row.name)}
                </Link>
              ),
            },
            {
              id: "slug",
              header: "Slug",
              sort: "alpha",
              getValue: (row) => row.slug,
              cell: (row) => <span className="font-mono text-xs">{row.slug}</span>,
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "alpha",
              getValue: (row) => row.slug,
              cell: () => "—",
            },
          ]}
        />
      </div>
    </Desk>
  );
}
