"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  approveApplicationRequest,
  cancelAuctionRequest,
  createAuctionRequest,
  endAuctionRequest,
  fetchAdminApplications,
  fetchAdminAuctions,
  goLiveAuctionRequest,
  rejectApplicationRequest,
  updateAuctionRequest,
  type ApiApplication,
  type ApiAuction,
} from "@/lib/auction-api";
import { fetchAdminProducts, type ApiProduct } from "@/lib/catalog-api";
import { formatMoney } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export default function AdminAuctions() {
  const { t, locale } = useStore();
  const [auctions, setAuctions] = useState<ApiAuction[]>([]);
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({
    product_id: "",
    type: "live",
    starting_price: "100",
    increment: "10",
    buy_now: "",
    reserve_price: "",
    ends_in_minutes: "60",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ increment: "", buy_now: "", extend_minutes: "15" });

  const load = useCallback(async () => {
    setError("");
    try {
      const [auctionRes, appRes, productRes] = await Promise.all([
        fetchAdminAuctions(),
        fetchAdminApplications("pending"),
        fetchAdminProducts({ per_page: 100 }),
      ]);
      setAuctions(auctionRes.data);
      setApplications(appRes.data);
      const published = productRes.data.filter((item) => item.status === "published");
      setProducts(published);
      setDraft((current) => current.product_id || !published[0] ? current : { ...current, product_id: String(published[0].id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAuction(event: React.FormEvent) {
    event.preventDefault();
    setBusyNotice();
    try {
      const ends = new Date(Date.now() + Number(draft.ends_in_minutes || 60) * 60_000).toISOString();
      await createAuctionRequest({
        product_id: Number(draft.product_id),
        type: draft.type,
        status: draft.type === "scheduled" ? "scheduled" : "live",
        starts_at: new Date().toISOString(),
        ends_at: ends,
        starting_price: Number(draft.starting_price),
        increment: Number(draft.increment),
        buy_now: draft.buy_now === "" ? null : Number(draft.buy_now),
        reserve_price: draft.reserve_price === "" ? null : Number(draft.reserve_price),
      });
      setNotice(t({ de: "Auktion angelegt.", en: "Auction created." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    }
  }

  function setBusyNotice() {
    setError("");
    setNotice("");
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.auctions">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Auktionen", en: "Auctions" })}</h1>
        </div>
        {notice ? <p className="mt-3 text-sm text-moss">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-copper">{error}</p> : null}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">{t({ de: "Teilnahmeanträge", en: "Participation requests" })}</h2>
          <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white text-sm">
            {applications.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{item.user?.name} · {item.user?.email}</p>
                  <p className="text-muted">
                    {item.auction?.product_name ? t(item.auction.product_name) : `Auction #${item.auction_id}`} · {item.auction?.slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => void approveApplicationRequest(item.id).then(load).catch((err) => setError(err instanceof ApiError ? err.message : "Error"))}
                  >
                    {t({ de: "Freigeben", en: "Approve" })}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void rejectApplicationRequest(item.id).then(load).catch((err) => setError(err instanceof ApiError ? err.message : "Error"))}
                  >
                    {t({ de: "Ablehnen", en: "Reject" })}
                  </Button>
                </div>
              </li>
            ))}
            {applications.length === 0 ? <li className="px-4 py-6 text-muted">{t({ de: "Keine offenen Anträge.", en: "No pending requests." })}</li> : null}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">{t({ de: "Neue Jala-Auktion", en: "New Jala auction" })}</h2>
          <form onSubmit={createAuction} className="mt-3 grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-2">
            <Field label={t({ de: "Produkt", en: "Product" })}>
              <select className={fieldClass} value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: e.target.value })} required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{t(product.name)}</option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select className={fieldClass} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="live">live</option>
                <option value="timed">timed</option>
                <option value="scheduled">scheduled</option>
              </select>
            </Field>
            <Field label={t({ de: "Startpreis", en: "Starting price" })}>
              <input className={fieldClass} type="number" step="0.01" value={draft.starting_price} onChange={(e) => setDraft({ ...draft, starting_price: e.target.value })} />
            </Field>
            <Field label="Increment">
              <input className={fieldClass} type="number" step="0.01" value={draft.increment} onChange={(e) => setDraft({ ...draft, increment: e.target.value })} />
            </Field>
            <Field label="Buy now">
              <input className={fieldClass} type="number" step="0.01" value={draft.buy_now} onChange={(e) => setDraft({ ...draft, buy_now: e.target.value })} />
            </Field>
            <Field label="Reserve">
              <input className={fieldClass} type="number" step="0.01" value={draft.reserve_price} onChange={(e) => setDraft({ ...draft, reserve_price: e.target.value })} />
            </Field>
            <Field label={t({ de: "Ende in Minuten", en: "Ends in minutes" })}>
              <input className={fieldClass} type="number" value={draft.ends_in_minutes} onChange={(e) => setDraft({ ...draft, ends_in_minutes: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">{t({ de: "Anlegen", en: "Create" })}</Button>
            </div>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">{t({ de: "Laufende & geplante", en: "Live & scheduled" })}</h2>
          <ul className="mt-3 space-y-3">
            {auctions.map((auction) => (
              <li key={auction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{auction.product ? t(auction.product.name) : auction.slug}</p>
                  <p className="text-muted">
                    {auction.status} · {formatMoney(auction.current_price, locale)} · {auction.applications_count ?? 0} apps · {auction.bids_count ?? 0} bids
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/auctions/${auction.slug}`} size="sm" variant="secondary">{t({ de: "Öffnen", en: "Open" })}</ButtonLink>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(auction.id);
                      setEditForm({
                        increment: String(auction.increment),
                        buy_now: auction.buy_now == null ? "" : String(auction.buy_now),
                        extend_minutes: "15",
                      });
                    }}
                  >
                    {t({ de: "Bearbeiten", en: "Edit" })}
                  </Button>
                  {auction.status === "scheduled" || auction.status === "draft" ? (
                    <Button size="sm" onClick={() => void goLiveAuctionRequest(auction.id).then(load)}>{t({ de: "Live", en: "Go live" })}</Button>
                  ) : null}
                  {auction.status === "live" ? (
                    <Button size="sm" variant="secondary" onClick={() => void endAuctionRequest(auction.id).then(load)}>{t({ de: "Beenden", en: "End" })}</Button>
                  ) : null}
                  {auction.status !== "ended" && auction.status !== "cancelled" ? (
                    <Button size="sm" variant="danger" onClick={() => void cancelAuctionRequest(auction.id).then(load)}>{t({ de: "Abbrechen", en: "Cancel" })}</Button>
                  ) : null}
                </div>
                {editingId === auction.id ? (
                  <form
                    className="mt-3 grid w-full gap-2 border-t border-line pt-3 sm:grid-cols-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const endsAt = auction.ends_at
                        ? new Date(new Date(auction.ends_at).getTime() + Number(editForm.extend_minutes || 0) * 60_000).toISOString()
                        : undefined;
                      void updateAuctionRequest(auction.id, {
                        increment: Number(editForm.increment),
                        buy_now: editForm.buy_now === "" ? null : Number(editForm.buy_now),
                        ends_at: endsAt,
                      })
                        .then(() => {
                          setEditingId(null);
                          setNotice(t({ de: "Auktion aktualisiert.", en: "Auction updated." }));
                          return load();
                        })
                        .catch((err) => setError(err instanceof ApiError ? err.message : "Error"));
                    }}
                  >
                    <Field label="Increment">
                      <input className={fieldClass} value={editForm.increment} onChange={(e) => setEditForm({ ...editForm, increment: e.target.value })} />
                    </Field>
                    <Field label="Buy now">
                      <input className={fieldClass} value={editForm.buy_now} onChange={(e) => setEditForm({ ...editForm, buy_now: e.target.value })} />
                    </Field>
                    <Field label={t({ de: "+ Minuten", en: "+ minutes" })}>
                      <input className={fieldClass} value={editForm.extend_minutes} onChange={(e) => setEditForm({ ...editForm, extend_minutes: e.target.value })} />
                    </Field>
                    <div className="flex items-end gap-2">
                      <Button type="submit" size="sm">{t({ de: "Speichern", en: "Save" })}</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t({ de: "Schließen", en: "Close" })}</Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </AdminGate>
    </AdminShell>
  );
}
