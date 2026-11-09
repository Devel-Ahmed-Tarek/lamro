"use client";

import { AdminShell } from "@/components/admin-shell";
import { Notice } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function AdminCommissionsPage() {
  const { t } = useStore();
  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Provisionen", en: "Commissions" })}</h1>
      <div className="mt-6">
        <Notice>
          {t({
            de: "Provisionen gehören zum External Partner und kommen mit diesem Modul (Coming soon).",
            en: "Commissions belong to External Partner and ship with that module (Coming soon).",
          })}
        </Notice>
      </div>
    </AdminShell>
  );
}
