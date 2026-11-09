"use client";

import { AdminShell } from "@/components/admin-shell";
import { Notice } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function SellersPage() {
  const { t } = useStore();
  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Verkäufer", en: "Sellers" })}</h1>
      <div className="mt-6">
        <Notice>
          {t({
            de: "Externe Partner-Verkäufer — Coming soon. Aktuell betreibt nur Jala Katalog und Auktionen.",
            en: "External partner sellers — Coming soon. Right now only Jala runs catalog and auctions.",
          })}
        </Notice>
      </div>
    </AdminShell>
  );
}
