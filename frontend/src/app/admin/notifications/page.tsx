"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Template = { id: number; key: string; enabled: boolean; subject: { de: string; en: string } };

export default function AdminNotificationsPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<Template[]>([]);

  async function load() {
    const response = await adminGet<Template[]>("/api/v1/admin/notification-templates");
    setItems((response as { data: Template[] }).data);
  }

  useEffect(() => {
    if (can("admin.notifications")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.notifications")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Benachrichtigungen", en: "Notifications" })}</h1>
      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-mono text-xs text-muted">{item.key}</p>
              <p>{item.subject.en}</p>
            </div>
            <button type="button" className="text-copper" onClick={() => void adminPut(`/api/v1/admin/notification-templates/${item.id}`, { enabled: !item.enabled }).then(load)}>
              {item.enabled ? "ON" : "OFF"}
            </button>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
