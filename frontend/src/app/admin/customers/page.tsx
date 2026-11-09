"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Customer = { id: number; name: string; email: string; is_active: boolean; company_name?: string | null };

export default function AdminCustomersPage() {
  const { t, can } = useStore();
  const [items, setItems] = useState<Customer[]>([]);

  async function load() {
    const response = await adminGet<Customer[]>("/api/v1/admin/customers");
    setItems((response as { data: Customer[] }).data);
  }

  useEffect(() => {
    if (can("admin.customers")) void load().catch(() => undefined);
  }, [can]);

  if (!can("admin.customers")) return <AdminShell><p className="text-sm text-muted">No access</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Kunden", en: "Customers" })}</h1>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.is_active ? "active" : "suspended"}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-copper" onClick={() => void adminPut(`/api/v1/admin/customers/${item.id}/active`, { is_active: !item.is_active }).then(load)}>
                    {item.is_active ? t({ de: "Sperren", en: "Suspend" }) : t({ de: "Freigeben", en: "Reinstate" })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
