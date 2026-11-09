"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Notice } from "@/components/ui";
import { fetchMyInquiries, type ApiInquiry } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function MessagesPage() {
  const { t, locale, authUser } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    fetchMyInquiries()
      .then((response) => setItems(response.data))
      .catch(() => setError(t({ de: "Nachrichten nicht geladen.", en: "Could not load messages." })));
  }, [authUser, t]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Nachrichten", en: "Messages" })}</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {items.length === 0 ? (
        <div className="mt-6"><Notice>{t({ de: "Keine Nachrichten.", en: "No messages." })}</Notice></div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-white p-5">
              <p className="font-mono text-xs text-muted">
                {item.type} · {item.status}
                {item.product ? ` · ${item.product.part_number || item.product.sku || item.product.slug}` : ""}
              </p>
              <p className="mt-3">{item.message}</p>
              {item.admin_reply ? (
                <p className="mt-3 text-sm text-muted">Jala: {item.admin_reply}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">{t({ de: "Wartet auf Antwort.", en: "Waiting for a reply." })}</p>
              )}
              {item.product ? (
                <Link href={`/store/${item.product.slug}`} className="mt-3 inline-block text-sm text-copper">
                  {locale === "de" ? item.product.name.de : item.product.name.en}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Desk>
  );
}
