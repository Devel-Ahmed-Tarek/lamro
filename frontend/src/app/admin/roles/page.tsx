"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { PERMISSION_LABELS, roleLabel } from "@/lib/admin-labels";
import {
  createRoleRequest,
  deleteRoleRequest,
  fetchRoles,
  updateRoleRequest,
  type AdminRole,
} from "@/lib/auth-api";
import { useStore } from "@/lib/store";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export default function AdminRolesPage() {
  const { t } = useStore();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [nameDraft, setNameDraft] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPermissions, setCreatePermissions] = useState<string[]>(["admin.overview", "admin.profile"]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => roles.find((role) => role.id === selectedId) ?? roles[0] ?? null,
    [roles, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchRoles();
      setRoles(response.data.roles);
      setAllPermissions(response.data.permissions);
      setSelectedId((current) => {
        if (current && response.data.roles.some((role) => role.id === current)) return current;
        return response.data.roles[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) setNameDraft(selected.name);
  }, [selected?.id, selected?.name]);

  async function togglePermission(permission: string) {
    if (!selected || selected.locked) return;
    const next = selected.permissions.includes(permission)
      ? selected.permissions.filter((item) => item !== permission)
      : [...selected.permissions, permission];
    setBusy(true);
    setError("");
    try {
      const response = await updateRoleRequest(selected.id, { permissions: next });
      setRoles((current) => current.map((role) => (role.id === selected.id ? response.data : role)));
      setNotice(t({ de: "Rechte gespeichert.", en: "Permissions saved." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Aktualisierung fehlgeschlagen.", en: "Update failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function renameRole(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || selected.locked) return;
    const next = slugify(nameDraft);
    if (!next || next === selected.id) return;
    setBusy(true);
    setError("");
    try {
      const response = await updateRoleRequest(selected.id, { name: next });
      setRoles((current) => current.map((role) => (role.id === selected.id ? response.data : role)));
      setSelectedId(response.data.id);
      setNotice(t({ de: "Rolle umbenannt.", en: "Role renamed." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Umbenennen fehlgeschlagen.", en: "Rename failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    const name = slugify(createName);
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const response = await createRoleRequest({ name, permissions: createPermissions });
      setCreateName("");
      setCreatePermissions(["admin.overview", "admin.profile"]);
      setNotice(t({ de: "Rolle angelegt.", en: "Role created." }));
      await load();
      setSelectedId(response.data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(role: AdminRole) {
    if (role.locked) return;
    if (!window.confirm(t({ de: `Rolle „${role.name}“ löschen?`, en: `Delete role “${role.name}”?` }))) return;
    setBusy(true);
    setError("");
    try {
      await deleteRoleRequest(role.id);
      setNotice(t({ de: "Rolle gelöscht.", en: "Role deleted." }));
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
              {t({ de: "Rollen & Rechte", en: "Roles & permissions" })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t({
                de: "Rollen anlegen, umbenennen, löschen und festlegen, welche Admin-Bereiche sichtbar sind.",
                en: "Create, rename, and delete roles — and choose which admin areas each role can access.",
              })}
            </p>
          </div>
          <Link
            href="/admin/team"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-ink"
          >
            {t({ de: "← Team verwalten", en: "← Manage team" })}
          </Link>
        </div>

        {notice ? <p className="mt-4 text-sm text-ok">{notice}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-muted">{t({ de: "Wird geladen…", en: "Loading…" })}</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_16px_40px_-28px_rgba(18,18,18,0.35)]">
              <h2 className="text-lg font-semibold">{t({ de: "Rollen", en: "Roles" })}</h2>
              <ul className="mt-4 space-y-2">
                {roles.map((role) => (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(role.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                        selected?.id === role.id ? "bg-ink text-white" : "border border-line bg-paper hover:border-ink/40"
                      }`}
                    >
                      <span>
                        <span className="block font-medium">{t(roleLabel(role.id))}</span>
                        <span className={`block text-[11px] ${selected?.id === role.id ? "text-white/70" : "text-muted"}`}>
                          {role.users_count ?? 0} {t({ de: "Nutzer", en: "users" })}
                          {role.locked ? ` · ${t({ de: "geschützt", en: "locked" })}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-line bg-white p-5">
              <h2 className="text-lg font-semibold">{t({ de: "Neue Rolle", en: "New role" })}</h2>
              <form onSubmit={createRole} className="mt-4 space-y-3">
                <Field label={t({ de: "Rollen-ID", en: "Role ID" })}>
                  <input
                    className={fieldClass}
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="warehouse_lead"
                    required
                  />
                </Field>
                <p className="text-xs text-muted">
                  {t({
                    de: "Nur Kleinbuchstaben, Zahlen und _ . Beispiel: lager_leitung",
                    en: "Lowercase letters, numbers and _ only. Example: warehouse_lead",
                  })}
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
                  {allPermissions.map((permission) => {
                    const on = createPermissions.includes(permission);
                    return (
                      <label key={permission} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-paper">
                        <span>{t(PERMISSION_LABELS[permission] ?? { de: permission, en: permission })}</span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setCreatePermissions((current) =>
                              on ? current.filter((item) => item !== permission) : [...current, permission],
                            )
                          }
                        />
                      </label>
                    );
                  })}
                </div>
                <Button type="submit" disabled={busy}>{t({ de: "Rolle anlegen", en: "Create role" })}</Button>
              </form>
            </section>
          </aside>

          <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_16px_40px_-28px_rgba(18,18,18,0.35)]">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{t(roleLabel(selected.id))}</h2>
                    <p className="mt-1 font-mono text-xs text-muted">{selected.id}</p>
                  </div>
                  {!selected.locked ? (
                    <Button size="sm" variant="danger" disabled={busy || (selected.users_count ?? 0) > 0} onClick={() => void removeRole(selected)}>
                      {t({ de: "Rolle löschen", en: "Delete role" })}
                    </Button>
                  ) : null}
                </div>

                {selected.locked ? (
                  <p className="mt-4 text-sm text-muted">
                    {t({
                      de: "Superadministrator hat alle Rechte und kann nicht geändert oder gelöscht werden.",
                      en: "Super Admin has all permissions and cannot be changed or deleted.",
                    })}
                  </p>
                ) : (
                  <form onSubmit={renameRole} className="mt-4 flex flex-wrap items-end gap-3">
                    <div className="min-w-56 flex-1">
                      <Field label={t({ de: "Rollen-ID umbenennen", en: "Rename role ID" })}>
                        <input className={fieldClass} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                      </Field>
                    </div>
                    <Button type="submit" variant="secondary" disabled={busy || slugify(nameDraft) === selected.id}>
                      {t({ de: "Umbenennen", en: "Rename" })}
                    </Button>
                  </form>
                )}

                {(selected.users_count ?? 0) > 0 && !selected.locked ? (
                  <p className="mt-3 text-xs text-muted">
                    {t({
                      de: "Löschen erst möglich, wenn keine Nutzer mehr diese Rolle haben.",
                      en: "Delete is only possible when no users have this role.",
                    })}
                  </p>
                ) : null}

                <h3 className="mt-8 text-sm font-semibold tracking-[0.08em] text-muted uppercase">
                  {t({ de: "Berechtigungen", en: "Permissions" })}
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {allPermissions.map((permission) => {
                    const on = selected.permissions.includes(permission) || selected.locked;
                    return (
                      <li key={permission}>
                        <button
                          type="button"
                          disabled={selected.locked || busy}
                          onClick={() => void togglePermission(permission)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                            on ? "border-copper/40 bg-[#fff6f1]" : "border-line bg-paper"
                          } ${selected.locked ? "cursor-default opacity-80" : "hover:border-copper/50"}`}
                        >
                          <span>{t(PERMISSION_LABELS[permission] ?? { de: permission, en: permission })}</span>
                          <span className={`text-xs font-medium ${on ? "text-copper" : "text-muted"}`}>
                            {on ? t({ de: "AN", en: "ON" }) : t({ de: "AUS", en: "OFF" })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">{t({ de: "Keine Rolle ausgewählt.", en: "No role selected." })}</p>
            )}
          </section>
        </div>
      </AdminGate>
    </AdminShell>
  );
}
