"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { formatMoney } from "@/lib/catalog";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Method = { id: number; code: string; name: { de: string; en: string }; price: number; is_active: boolean };

export default function AdminShippingPage() {
  const { t, locale, can } = useStore();
  const [items, setItems] = useState<Method[]>([]);

  async function load() {
    const response = await adminGet<Method[]>("/api/v1/admin/shipping-methods");
    setItems((response as { data: Method[] }).data);
  }

  useEffect(() => {
    if (can("admin.shipping")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.shipping")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Versand", en: "Shipping" })}</h1>
      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{locale === "de" ? item.name.de : item.name.en}</p>
              <p className="font-mono text-xs text-muted">{item.code} · {formatMoney(item.price, locale)}</p>
            </div>
            <button type="button" className="text-copper" onClick={() => void adminPut(`/api/v1/admin/shipping-methods/${item.id}`, { is_active: !item.is_active }).then(load)}>
              {item.is_active ? "ON" : "OFF"}
            </button>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
