"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { adminGet } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Log = { id: number; action: string; created_at: string; user?: { name: string; email: string } | null; meta?: unknown };

export default function AdminAuditPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<Log[]>([]);

  useEffect(() => {
    if (!can("admin.audit")) return;
    void adminGet<Log[]>("/api/v1/admin/audit").then((response) => setItems((response as { data: Log[] }).data));
  }, [can]);

  if (!can("admin.audit")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Audit-Log", en: "Audit log" })}</h1>
      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white text-sm">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <p className="font-mono text-xs text-muted">{item.created_at}</p>
            <p className="mt-1">{item.action} · {item.user?.email ?? "system"}</p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
