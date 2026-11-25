"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { adminGet } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Log = {
  id: number;
  action: string;
  created_at: string;
  user?: { name: string; email: string } | null;
  meta?: unknown;
};

export default function AdminAuditPage() {
  const { t, can, locale } = useStore();
  const [items, setItems] = useState<Log[]>([]);

  useEffect(() => {
    if (!can("admin.audit")) return;
    void adminGet<Log[]>("/api/v1/admin/audit").then((response) => setItems((response as { data: Log[] }).data));
  }, [can]);

  if (!can("admin.audit")) {
    return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Audit-Log", en: "Audit log" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({ de: "Nur Lesen und Sortieren — Einträge werden nicht gelöscht.", en: "Read and sort only — entries are not deleted." })}
      </p>
      <div className="mt-6">
        <DataTable
          rows={items}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          selectable={false}
          hideActions
          getSearchText={(row) => `${row.action} ${row.user?.email ?? ""}`}
          columns={[
            {
              id: "created_at",
              header: { de: "Zeit", en: "Time" },
              sort: "date",
              getValue: (row) => row.created_at,
              cell: (row) => new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB"),
            },
            {
              id: "action",
              header: { de: "Aktion", en: "Action" },
              sort: "alpha",
              getValue: (row) => row.action,
              cell: (row) => row.action,
            },
            {
              id: "user",
              header: { de: "Nutzer", en: "User" },
              sort: "alpha",
              getValue: (row) => row.user?.email ?? "system",
              cell: (row) => row.user?.email ?? t({ de: "System", en: "system" }),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
