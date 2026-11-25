"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { PERMISSION_LABELS, roleLabel } from "@/lib/admin-labels";
import { DataTable } from "@/components/data-table";
import {
  bulkDeleteStaffRequest,
  createStaffRequest,
  deleteStaffRequest,
  fetchRoles,
  fetchStaff,
  updateStaffRequest,
  type AdminRole,
  type AuthUser,
} from "@/lib/auth-api";
import { useStore } from "@/lib/store";

type Draft = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  is_active: boolean;
};

const emptyDraft = (role = "support"): Draft => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  role,
  is_active: true,
});

export default function AdminTeamPage() {
  const { t, authUser, locale } = useStore();
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [editForm, setEditForm] = useState<Draft>(emptyDraft());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, rolesRes] = await Promise.all([fetchStaff(), fetchRoles()]);
      setStaff(staffRes.data);
      setRoles(rolesRes.data.roles);
      setDraft((current) =>
        current.role && rolesRes.data.roles.some((role) => role.id === current.role)
          ? current
          : emptyDraft(rolesRes.data.roles.find((role) => role.id !== "super_admin")?.id ?? rolesRes.data.roles[0]?.id ?? "support"),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(member: AuthUser) {
    setEditing(member);
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      password: "",
      role: member.roles[0] ?? roles[0]?.id ?? "support",
      is_active: member.is_active,
    });
    setNotice("");
    setError("");
  }

  async function createMember(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createStaffRequest({
        name: draft.name,
        email: draft.email,
        phone: draft.phone || undefined,
        password: draft.password,
        role: draft.role,
        is_active: draft.is_active,
      });
      setDraft(emptyDraft(draft.role));
      setNotice(t({ de: "Mitarbeiter angelegt.", en: "Team member created." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await updateStaffRequest(editing.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
        is_active: editForm.is_active,
        ...(editForm.password.trim() ? { password: editForm.password } : {}),
      });
      setNotice(t({ de: "Mitarbeiter aktualisiert.", en: "Team member updated." }));
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktualisierung fehlgeschlagen.", en: "Update failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member: AuthUser) {
    if (member.id === authUser?.id) {
      setError(t({ de: "Sie können sich nicht selbst löschen.", en: "You cannot delete yourself." }));
      return;
    }
    if (!window.confirm(t({ de: `${member.name} wirklich löschen?`, en: `Delete ${member.name}?` }))) return;
    setBusy(true);
    setError("");
    try {
      await deleteStaffRequest(member.id);
      if (editing?.id === member.id) setEditing(null);
      setNotice(t({ de: "Mitarbeiter gelöscht.", en: "Team member deleted." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Löschen fehlgeschlagen.", en: "Delete failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <AdminGate permission="admin.staff">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">
              {t({ de: "Zugang", en: "Access" })}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {t({ de: "Team", en: "Team" })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t({
                de: "Admin-Nutzer anlegen, bearbeiten, sperren oder löschen — und die Rolle je Person festlegen.",
                en: "Create, edit, disable, or delete admin users — and assign each person a role.",
              })}
            </p>
          </div>
          <Link
            href="/admin/roles"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-ink"
          >
            {t({ de: "Rollen & Rechte →", en: "Roles & permissions →" })}
          </Link>
        </div>

        {notice ? <p className="mt-4 text-sm text-ok">{notice}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_16px_40px_-28px_rgba(18,18,18,0.35)]">
            <h2 className="text-lg font-semibold">{t({ de: "Mitarbeiter anlegen", en: "Add team member" })}</h2>
            <form onSubmit={createMember} className="mt-4 space-y-3">
              <Field label={t({ de: "Name", en: "Name" })}>
                <input className={fieldClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </Field>
              <Field label={t({ de: "E-Mail", en: "Email" })}>
                <input type="email" className={fieldClass} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
              </Field>
              <Field label={t({ de: "Telefon", en: "Phone" })}>
                <input className={fieldClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label={t({ de: "Passwort", en: "Password" })}>
                <input type="password" className={fieldClass} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} required minLength={4} />
              </Field>
              <Field label={t({ de: "Rolle", en: "Role" })}>
                <select className={fieldClass} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{t(roleLabel(role.id))}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
                {t({ de: "Sofort aktiv", en: "Active immediately" })}
              </label>
              <Button type="submit" disabled={busy}>{t({ de: "Anlegen", en: "Create" })}</Button>
            </form>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_16px_40px_-28px_rgba(18,18,18,0.35)]">
            <h2 className="mb-4 text-lg font-semibold">{t({ de: "Teammitglieder", en: "Team members" })}</h2>
            <DataTable
              rows={staff}
              rowKey={(row) => row.id}
              defaultSortId="name"
              getSearchText={(row) => `${row.name} ${row.email} ${row.roles.join(" ")}`}
              rowDisabled={(row) => row.id === authUser?.id}
              onEdit={(row) => openEdit(row)}
              onDelete={(row) => removeMember(row)}
              onBulkDelete={async (rows) => {
                await bulkDeleteStaffRequest(rows.map((row) => row.id));
                setNotice(t({ de: "Auswahl gelöscht.", en: "Selection deleted." }));
                await load();
              }}
              columns={[
                {
                  id: "name",
                  header: { de: "Name", en: "Name" },
                  sort: "alpha",
                  getValue: (row) => row.name,
                  cell: (row) => (
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted">
                        {row.permissions.slice(0, 4).map((permission) => t(PERMISSION_LABELS[permission] ?? { de: permission, en: permission })).join(" · ")}
                      </p>
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
                  id: "role",
                  header: { de: "Rolle", en: "Role" },
                  sort: "alpha",
                  getValue: (row) => row.roles[0] ?? "",
                  cell: (row) => t(roleLabel(row.roles[0] ?? "—")),
                },
                {
                  id: "status",
                  header: { de: "Status", en: "Status" },
                  sort: "alpha",
                  getValue: (row) => (row.is_active ? "aktiv" : "deaktiviert"),
                  cell: (row) => (row.is_active ? t({ de: "Aktiv", en: "Active" }) : t({ de: "Deaktiviert", en: "Disabled" })),
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

            {editing ? (
              <form onSubmit={saveEdit} className="mt-6 space-y-3 rounded-3xl border border-line bg-paper p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{t({ de: "Bearbeiten", en: "Edit" })}: {editing.name}</h3>
                  <button type="button" className="text-sm text-muted" onClick={() => setEditing(null)}>
                    {t({ de: "Schließen", en: "Close" })}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t({ de: "Name", en: "Name" })}>
                    <input className={fieldClass} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  </Field>
                  <Field label={t({ de: "E-Mail", en: "Email" })}>
                    <input type="email" className={fieldClass} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                  </Field>
                  <Field label={t({ de: "Telefon", en: "Phone" })}>
                    <input className={fieldClass} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </Field>
                  <Field label={t({ de: "Neues Passwort", en: "New password" })}>
                    <input type="password" className={fieldClass} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder={t({ de: "leer = unverändert", en: "empty = unchanged" })} />
                  </Field>
                  <Field label={t({ de: "Rolle", en: "Role" })}>
                    <select className={fieldClass} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{t(roleLabel(role.id))}</option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                    {t({ de: "Konto aktiv", en: "Account active" })}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy}>{t({ de: "Speichern", en: "Save" })}</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t({ de: "Abbrechen", en: "Cancel" })}</Button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      </AdminGate>
    </AdminShell>
  );
}
