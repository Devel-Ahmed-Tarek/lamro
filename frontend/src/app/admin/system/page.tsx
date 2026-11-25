"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui";
import { adminGet, adminPost } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Status = { app: string; maintenance: boolean; last_backup: string | null; orders_pending_payment: number };
type Backup = { id: number; path: string; size_bytes: number; created_at: string };

export default function AdminSystemPage() {
  const { t, can } = useStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);

  async function load() {
    const [s, b] = await Promise.all([
      adminGet<Status>("/api/v1/admin/system/status"),
      adminGet<Backup[]>("/api/v1/admin/system/backups"),
    ]);
    setStatus((s as { data: Status }).data);
    setBackups((b as { data: Backup[] }).data);
  }

  useEffect(() => {
    if (can("admin.system")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.system")) return <AdminShell><p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "System & Sicherung", en: "System & backup" })}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {t({
          en: "Run a backup before major releases or migrations. Keep at least one recent copy off the app server.",
        })}
      </p>
      {status ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
          <div className="rounded-3xl border border-line bg-white p-4"><dt className="text-muted">{t({ de: "Anwendung", en: "App" })}</dt><dd className="mt-1 font-medium">{status.app}</dd></div>
          <div className="rounded-3xl border border-line bg-white p-4"><dt className="text-muted">{t({ de: "Wartungsmodus", en: "Maintenance" })}</dt><dd className="mt-1 font-medium">{status.maintenance ? t({ de: "AN", en: "ON" }) : t({ de: "AUS", en: "OFF" })}</dd></div>
          <div className="rounded-3xl border border-line bg-white p-4"><dt className="text-muted">{t({ de: "Offene Zahlungen", en: "Pending payments" })}</dt><dd className="mt-1 font-medium">{status.orders_pending_payment}</dd></div>
          <div className="rounded-3xl border border-line bg-white p-4 sm:col-span-3"><dt className="text-muted">{t({ de: "Letztes Backup", en: "Last backup" })}</dt><dd className="mt-1 font-medium">{status.last_backup ?? "—"}</dd></div>
        </dl>
      ) : null}
      <div className="mt-6">
        <Button onClick={() => void adminPost("/api/v1/admin/system/backups").then(load)}>{t({ de: "Sicherung jetzt erstellen", en: "Run backup" })}</Button>
      </div>
      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white text-sm">
        {backups.map((item) => (
          <li key={item.id} className="px-4 py-3 font-mono text-xs">{item.created_at} · {item.path} · {item.size_bytes} B</li>
        ))}
      </ul>
    </AdminShell>
  );
}
