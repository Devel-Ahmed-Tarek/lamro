"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { Notice } from "@/components/ui";
import { fetchWatchlist } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type WatchRow = { slug: string; name: Record<string, string> };

export default function WatchPage() {
  const { t, watch, toggleWatch, ready, authUser } = useStore();
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWatchlist()
      .then((response) => {
        const fromApi = response.data
          .map((item) => item.product)
          .filter((product): product is NonNullable<typeof product> => Boolean(product))
          .map((product) => ({ slug: product.slug, name: product.name }));
        if (fromApi.length) {
          setRows(fromApi);
          return;
        }
        setRows(watch.map((slug) => ({ slug, name: { en: slug, de: slug } })));
      })
      .catch(() => setRows(watch.map((slug) => ({ slug, name: { en: slug, de: slug } }))))
      .finally(() => setLoading(false));
  }, [ready, authUser, watch]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Merkliste", en: "Watchlist" })}</h1>
      <div className="mt-6">
        {!loading && rows.length === 0 ? (
          <Notice>
            {t({ en: "Your watchlist is empty." })}{" "}
            <Link href="/store" className="text-copper">{t({ en: "Browse the store" })}</Link>
          </Notice>
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.slug}
            defaultSortId="name"
            getSearchText={(row) => `${t(row.name)} ${row.slug}`}
            emptyText={{ de: "Ihre Merkliste ist leer.", en: "Your watchlist is empty." }}
            onEdit={(row) => {
              window.location.href = `/store/${row.slug}`;
            }}
            editLabel={{ de: "Öffnen", en: "Open" }}
            onDelete={async (row) => {
              toggleWatch(row.slug);
            }}
            onBulkDelete={async (selected) => {
              selected.forEach((row) => toggleWatch(row.slug));
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
            ]}
          />
        )}
      </div>
    </Desk>
  );
}
