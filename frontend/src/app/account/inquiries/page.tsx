"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Desk, useCustomerNav } from "@/components/desk";
import { Notice } from "@/components/ui";
import { fetchMyInquiries, type ApiInquiry } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

export default function InquiriesPage() {
  const { t, locale, authUser } = useStore();
  const [items, setItems] = useState<ApiInquiry[]>([]);

  useEffect(() => {
    if (!authUser) return;
    fetchMyInquiries()
      .then((response) => setItems(response.data.filter((item) => item.type !== "contact")))
      .catch(() => undefined);
  }, [authUser]);

  return (
    <Desk title={t({ de: "Kundenkonto", en: "Customer" })} items={useCustomerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Artikelanfragen", en: "Product inquiries" })}</h1>
      {items.length === 0 ? (
        <div className="mt-6"><Notice>{t({ de: "Keine Anfragen.", en: "No inquiries." })}</Notice></div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <Link key={item.id} href="/account/messages" className="block rounded-2xl border border-line bg-white p-4 text-sm">
              <span className="font-mono text-xs text-muted">{item.type} · {item.status}</span>
              <p className="mt-2">
                {item.product
                  ? (locale === "de" ? item.product.name.de : item.product.name.en)
                  : item.message.slice(0, 80)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Desk>
  );
}
