"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function AdminGate({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { ready, can, t } = useStore();
  const router = useRouter();
  const allowed = can(permission);

  useEffect(() => {
    if (ready && !allowed) router.replace("/admin");
  }, [ready, allowed, router]);

  if (!ready) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (!allowed) {
    return <p className="text-sm text-muted">{t({ de: "Keine Berechtigung.", en: "No permission." })}</p>;
  }

  return children;
}
