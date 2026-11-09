"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAdminUser } from "@/lib/auth-api";
import { useStore } from "@/lib/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, authUser, role } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!authUser || !isAdminUser(authUser) || role !== "admin") {
      router.replace("/login");
    }
  }, [ready, authUser, role, router]);

  if (!ready) {
    return <div className="grid flex-1 place-items-center p-10 text-sm text-muted">Loading…</div>;
  }

  if (!authUser || !isAdminUser(authUser)) {
    return <div className="grid flex-1 place-items-center p-10 text-sm text-muted">Redirecting…</div>;
  }

  return children;
}
