"use client";

import { Desk, useSellerNav } from "@/components/desk";
import { DataTable } from "@/components/data-table";
import { useStore } from "@/lib/store";

type InquiryRow = {
  id: number;
  subject: string;
  status: string;
  created_at: string;
};

export default function SellerInquiriesPage() {
  const { t, locale } = useStore();
  const rows: InquiryRow[] = [];

  return (
    <Desk title={t({ de: "Verkäufer", en: "Seller" })} items={useSellerNav()}>
      <h1 className="text-3xl font-semibold">{t({ de: "Anfragen", en: "Inquiries" })}</h1>
      <p className="mt-2 text-sm text-muted">
        {t({
          de: "Partner-Anfragen folgen in Kürze — Tabellenlayout ist bereit.",
          en: "Partner inquiries come soon — table layout is ready.",
        })}
      </p>
      <div className="mt-6">
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          defaultSortId="created_at"
          defaultSortDir="desc"
          onEdit={() => undefined}
          onDelete={async () => undefined}
          onBulkDelete={async () => undefined}
          columns={[
            {
              id: "subject",
              header: { de: "Betreff", en: "Subject" },
              sort: "alpha",
              getValue: (row) => row.subject,
              cell: (row) => row.subject,
            },
            {
              id: "status",
              header: { de: "Status", en: "Status" },
              sort: "alpha",
              getValue: (row) => row.status,
              cell: (row) => row.status,
            },
            {
              id: "created_at",
              header: { de: "Erstellt", en: "Created" },
              sort: "date",
              getValue: (row) => row.created_at,
              cell: (row) => new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB"),
            },
          ]}
        />
      </div>
    </Desk>
  );
}
