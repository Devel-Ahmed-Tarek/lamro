"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  bulkDeleteCompanyStockListings,
  deleteCompanyStockListing,
  fetchAdminCompanyStockListings,
  updateCompanyStockListing,
  type CompanyStockListing,
} from "@/lib/company-stock-api";
import { useStore } from "@/lib/store";

const STATUS_LABELS: Record<string, { de: string; en: string }> = {
  new: { de: "Neu", en: "New" },
  contacted: { de: "Kontaktiert", en: "Contacted" },
  closed: { de: "Geschlossen", en: "Closed" },
};

export default function AdminCompanyStockPage() {
  const { t, locale } = useStore();
  const [items, setItems] = useState<CompanyStockListing[]>([]);
  const [selected, setSelected] = useState<CompanyStockListing | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminCompanyStockListings();
      setItems(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell>
      <AdminGate permission="admin.company_stock">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t({ de: "Firmenlager-Anfragen", en: "Company stock listings" })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {t({
            de: "Öffentliche Meldungen von Firmen mit Lagerbestand — inkl. Fotos, Mobilnummer und E-Mail.",
            en: "Public listings from companies with inventory — including photos, mobile and email.",
          })}
        </p>
        {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-6">
          <DataTable
            rows={items}
            rowKey={(row) => row.id}
            defaultSortId="created_at"
            defaultSortDir="desc"
            getSearchText={(row) =>
              `${row.company_name} ${row.contact_name} ${row.email} ${row.phone} ${row.inventory_type ?? ""} ${row.description}`
            }
            onEdit={(row) => {
              setSelected(row);
              setNote(row.admin_note ?? "");
            }}
            onDelete={async (row) => {
              await deleteCompanyStockListing(row.id);
              if (selected?.id === row.id) setSelected(null);
              setNotice(t({ de: "Eintrag gelöscht.", en: "Listing deleted." }));
              await load();
            }}
            onBulkDelete={async (rows) => {
              await bulkDeleteCompanyStockListings(rows.map((row) => row.id));
              setSelected(null);
              setNotice(t({ de: "Auswahl gelöscht.", en: "Selection deleted." }));
              await load();
            }}
            columns={[
              {
                id: "company_name",
                header: { de: "Firma", en: "Company" },
                sort: "alpha",
                getValue: (row) => row.company_name,
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.company_name}</p>
                    <p className="text-xs text-muted">{row.inventory_type || "—"}</p>
                  </div>
                ),
              },
              {
                id: "contact",
                header: { de: "Kontakt", en: "Contact" },
                sort: "alpha",
                getValue: (row) => row.contact_name,
                cell: (row) => (
                  <div className="text-sm">
                    <p>{row.contact_name}</p>
                    <a className="text-copper" href={`mailto:${row.email}`}>{row.email}</a>
                    <p><a className="text-copper" href={`tel:${row.phone}`}>{row.phone}</a></p>
                  </div>
                ),
              },
              {
                id: "status",
                header: { de: "Status", en: "Status" },
                sort: "alpha",
                getValue: (row) => row.status,
                cell: (row) => t(STATUS_LABELS[row.status] ?? { de: row.status, en: row.status }),
              },
              {
                id: "photos",
                header: { de: "Fotos", en: "Photos" },
                sort: "number",
                getValue: (row) => row.photos?.length ?? 0,
                cell: (row) => row.photos?.length ?? 0,
              },
              {
                id: "created_at",
                header: { de: "Erstellt", en: "Created" },
                sort: "date",
                getValue: (row) => row.created_at,
                cell: (row) =>
                  row.created_at ? new Date(row.created_at).toLocaleString(locale === "de" ? "de-DE" : "en-GB") : "—",
              },
            ]}
          />
        </div>

        {selected ? (
          <section className="mt-6 space-y-4 rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{selected.company_name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {selected.contact_name} · {selected.email} · {selected.phone}
                  {selected.city ? ` · ${selected.city}` : ""}
                  {selected.country ? `, ${selected.country}` : ""}
                </p>
              </div>
              <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>
                {t({ de: "Schließen", en: "Close" })}
              </button>
            </div>

            <p className="text-sm whitespace-pre-wrap">{selected.description}</p>

            {selected.photos?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selected.photos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="h-32 w-full rounded-2xl border border-line object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <textarea
                className={fieldClass}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t({ de: "Interne Notiz", en: "Internal note" })}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    void updateCompanyStockListing(selected.id, { status: "contacted", admin_note: note })
                      .then(() => {
                        setNotice(t({ de: "Als kontaktiert markiert.", en: "Marked as contacted." }));
                        return load();
                      })
                      .catch((err) => setError(err instanceof ApiError ? err.message : t({ de: "Fehler.", en: "Error." })))
                  }
                >
                  {t({ de: "Kontaktiert", en: "Contacted" })}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void updateCompanyStockListing(selected.id, { status: "closed", admin_note: note })
                      .then(() => {
                        setNotice(t({ de: "Geschlossen.", en: "Closed." }));
                        return load();
                      })
                      .catch((err) => setError(err instanceof ApiError ? err.message : t({ de: "Fehler.", en: "Error." })))
                  }
                >
                  {t({ de: "Schließen", en: "Close listing" })}
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </AdminGate>
    </AdminShell>
  );
}
