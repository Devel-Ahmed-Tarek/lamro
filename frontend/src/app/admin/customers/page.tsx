"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { adminGet, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type Customer = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  company_name?: string | null;
  created_at?: string | null;
};

export default function AdminCustomersPage() {
  const { t, can, locale } = useStore();
  const [items, setItems] = useState<Customer[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await adminGet<Customer[]>("/api/v1/admin/customers");
    setItems((response as { data: Customer[] }).data);
  }

  useEffect(() => {
    if (can("admin.customers")) void load().catch(() => setError(t({ de: "Laden fehlgeschlagen.", en: "Failed to load." })));
  }, [can, t]);

  if (!can("admin.customers")) {
    return (
      <AdminShell>
        <p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Kunden", en: "Customers" })}</h1>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <DataTable
          rows={items}
          rowKey={(row) => row.id}
          defaultSortId="name"
          getSearchText={(row) => `${row.name} ${row.email} ${row.company_name ?? ""}`}
          onEdit={async (row) => {
            await adminPut(`/api/v1/admin/customers/${row.id}/active`, { is_active: !row.is_active });
            setNotice(
              row.is_active
                ? t({ de: "Kunde gesperrt.", en: "Customer suspended." })
                : t({ de: "Kunde freigegeben.", en: "Customer reinstated." }),
            );
            await load();
          }}
          editLabel={{ de: "Status umschalten", en: "Toggle status" }}
          onDelete={async (row) => {
            await adminPut(`/api/v1/admin/customers/${row.id}/active`, { is_active: false });
            setNotice(t({ de: "Kunde deaktiviert.", en: "Customer disabled." }));
            await load();
          }}
          onBulkDelete={async (rows) => {
            await Promise.all(rows.map((row) => adminPut(`/api/v1/admin/customers/${row.id}/active`, { is_active: false })));
            setNotice(t({ de: "Auswahl deaktiviert.", en: "Selection disabled." }));
            await load();
          }}
          deleteLabel={{ de: "Deaktivieren?", en: "Disable?" }}
          bulkDeleteLabel={{ de: "Auswahl deaktivieren", en: "Disable selected" }}
          columns={[
            {
              id: "name",
              header: { de: "Name", en: "Name" },
              sort: "alpha",
              getValue: (row) => row.name,
              cell: (row) => (
                <div>
                  <p className="font-medium">{row.name}</p>
                  {row.company_name ? <p className="text-xs text-muted">{row.company_name}</p> : null}
                </div>
              ),
            },
            {
              id: "email",
              header: { de: "E-Mail", en: "Email" },
              sort: "alpha",
              getValue: (row) => row.email,
              cell: (row) => row.email,
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => (row.is_active ? "aktiv" : "gesperrt"),
              cell: (row) => (row.is_active ? t({ de: "aktiv", en: "active" }) : t({ de: "gesperrt", en: "suspended" })),
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "date",
              getValue: (row) => row.created_at,
              cell: (row) => (row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—"),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
