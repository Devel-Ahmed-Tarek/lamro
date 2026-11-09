"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Feature = { id: number; key: string; enabled: boolean };

export default function FeaturesPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<Feature[]>([]);

  async function load() {
    const response = await adminGet<Feature[]>("/api/v1/admin/features");
    setItems((response as { data: Feature[] }).data);
  }

  useEffect(() => {
    if (can("admin.features")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.features")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Funktionen", en: "Features" })}</h1>
      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-mono">{item.key}</span>
            <button
              type="button"
              className={item.enabled ? "text-moss" : "text-muted"}
              onClick={() => void adminPut(`/api/v1/admin/features/${item.key}`, { enabled: !item.enabled }).then(load)}
            >
              {item.enabled ? "ON" : "OFF"}
            </button>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
