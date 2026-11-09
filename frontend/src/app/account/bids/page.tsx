"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { ApiError } from "@/lib/api";
import { fetchMyApplications, fetchMyBids, type ApiApplication, type ApiBid } from "@/lib/auction-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function BidsPage() {
  const { t, locale } = useStore();
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [bids, setBids] = useState<ApiBid[]>([]);
  const [error, setError] = useState("");

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
      <ul className="mt-3 space-y-3">
        {applications.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.auction?.product_name ? t(item.auction.product_name) : `Auction #${item.auction_id}`}</p>
                <p className="text-muted">{item.status}</p>
              </div>
              {item.auction?.slug ? <Link href={`/auctions/${item.auction.slug}`} className="text-copper">{t({ de: "Öffnen", en: "Open" })}</Link> : null}
            </div>
          </li>
        ))}
        {applications.length === 0 ? <li className="text-sm text-muted">{t({ de: "Keine Anträge.", en: "No applications." })}</li> : null}
      </ul>

      <h2 className="mt-8 font-semibold">{t({ de: "Meine Gebote", en: "My bids" })}</h2>
      <ul className="mt-3 space-y-3">
        {bids.map((bid) => (
          <li key={bid.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {bid.auction?.product_name ? t(bid.auction.product_name) : `Auction #${bid.auction_id}`} · {formatMoney(bid.amount, locale)}
                  {bid.is_proxy ? " · auto" : ""}
                </p>
                <p className="text-muted">{bid.auction?.status ?? "—"}</p>
              </div>
              {bid.auction?.slug ? <Link href={`/auctions/${bid.auction.slug}`} className="text-copper">{t({ de: "Öffnen", en: "Open" })}</Link> : null}
            </div>
          </li>
        ))}
        {bids.length === 0 ? <li className="text-sm text-muted">{t({ de: "Noch keine Gebote.", en: "No bids yet." })}</li> : null}
      </ul>
    </Desk>
  );
}
