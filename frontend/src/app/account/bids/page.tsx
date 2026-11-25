"use client";

import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { ApiError } from "@/lib/api";
import { fetchMyApplications, fetchMyBids, type ApiApplication, type ApiBid } from "@/lib/auction-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function BidsPage() {
  const { t, locale } = useStore();
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [bids, setBids] = useState<ApiBid[]>([]);
  const [error, setError] = useState("");
  const [hiddenApps, setHiddenApps] = useState<Set<number>>(new Set());
  const [hiddenBids, setHiddenBids] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([fetchMyApplications(), fetchMyBids()])
      .then(([apps, bidRes]) => {
        setApplications(apps.data);
        setBids(bidRes.data);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
      });
  }, [t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Gebote & Anträge", en: "Bids & applications" })}</h1>
      {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

      <h2 className="mt-8 font-semibold">{t({ de: "Teilnahmeanträge", en: "Participation applications" })}</h2>
      <div className="mt-3">
        <DataTable
          rows={applications.filter((item) => !hiddenApps.has(item.id))}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.auction?.product_name ? t(row.auction.product_name) : ""} ${row.status}`}
          onEdit={(row) => {
            if (row.auction?.slug) window.location.href = `/auctions/${row.auction.slug}`;
          }}
          editLabel={{ de: "Öffnen", en: "Open" }}
          onDelete={async (row) => setHiddenApps((current) => new Set(current).add(row.id))}
          onBulkDelete={async (rows) => {
            setHiddenApps((current) => {
              const next = new Set(current);
              rows.forEach((row) => next.add(row.id));
              return next;
            });
          }}
          deleteLabel={{ de: "Aus Ansicht ausblenden?", en: "Hide from view?" }}
          bulkDeleteLabel={{ de: "Auswahl ausblenden", en: "Hide selected" }}
          columns={[
            {
              id: "name",
              header: { de: "Auktion", en: "Auction" },
              sort: "alpha",
              getValue: (row) => (row.auction?.product_name ? t(row.auction.product_name) : String(row.auction_id)),
              cell: (row) => (row.auction?.product_name ? t(row.auction.product_name) : `Auction #${row.auction_id}`),
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

      <h2 className="mt-8 font-semibold">{t({ de: "Meine Gebote", en: "My bids" })}</h2>
      <div className="mt-3">
        <DataTable
          rows={bids.filter((item) => !hiddenBids.has(item.id))}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          getSearchText={(row) => `${row.auction?.product_name ? t(row.auction.product_name) : ""} ${row.amount}`}
          onEdit={(row) => {
            if (row.auction?.slug) window.location.href = `/auctions/${row.auction.slug}`;
          }}
          editLabel={{ de: "Öffnen", en: "Open" }}
          onDelete={async (row) => setHiddenBids((current) => new Set(current).add(row.id))}
          onBulkDelete={async (rows) => {
            setHiddenBids((current) => {
              const next = new Set(current);
              rows.forEach((row) => next.add(row.id));
              return next;
            });
          }}
          deleteLabel={{ de: "Aus Ansicht ausblenden?", en: "Hide from view?" }}
          bulkDeleteLabel={{ de: "Auswahl ausblenden", en: "Hide selected" }}
          columns={[
            {
              id: "name",
              header: { de: "Auktion", en: "Auction" },
              sort: "alpha",
              getValue: (row) => (row.auction?.product_name ? t(row.auction.product_name) : String(row.auction_id)),
              cell: (row) => (
                <span>
                  {row.auction?.product_name ? t(row.auction.product_name) : `Auction #${row.auction_id}`}
                  {row.is_proxy ? ` · ${t({ de: "Auto", en: "auto" })}` : ""}
                </span>
              ),
            },
            {
              id: "amount",
              header: { de: "Gebot", en: "Bid" },
              sort: "number",
              getValue: (row) => row.amount,
              cell: (row) => formatMoney(row.amount, locale),
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => row.auction?.status ?? "",
              cell: (row) => row.auction?.status ?? "—",
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
