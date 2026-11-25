"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { useStore } from "@/lib/store";

export default function AdminStaffRedirectPage() {
  const router = useRouter();
  const { t } = useStore();

  useEffect(() => {
    router.replace("/admin/team");
  }, [router]);

  return (
    <AdminShell>
      <p className="text-sm text-muted">{t({ de: "Weiterleitung zum Team…", en: "Redirecting to team…" })}</p>
    </AdminShell>
  );
}
