"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  createStaffRequest,
  fetchRoles,
  fetchStaff,
  updateRolePermissionsRequest,
  updateStaffRequest,
  type AuthUser,
} from "@/lib/auth-api";
import { useStore } from "@/lib/store";

const ROLE_LABELS: Record<string, { de: string; en: string }> = {
  super_admin: { de: "Super Admin", en: "Super Admin" },
  ops: { de: "Betrieb", en: "Operations" },
  catalog: { de: "Katalog", en: "Catalog" },
  support: { de: "Support", en: "Support" },
};

const PERMISSION_LABELS: Record<string, { de: string; en: string }> = {
  "admin.overview": { de: "Übersicht", en: "Overview" },
  "admin.features": { de: "Funktionen", en: "Features" },
  "admin.cms": { de: "CMS", en: "CMS" },
  "admin.products": { de: "Artikel", en: "Products" },
  "admin.categories": { de: "Kategorien", en: "Categories" },
  "admin.brands": { de: "Hersteller", en: "Brands" },
  "admin.inventory": { de: "Lager", en: "Inventory" },
  "admin.auctions": { de: "Auktionen", en: "Auctions" },
  "admin.sellers": { de: "Verkäufer", en: "Sellers" },
  "admin.customers": { de: "Kunden", en: "Customers" },
  "admin.staff": { de: "Mitarbeiter & Rollen", en: "Staff & roles" },
  "admin.orders": { de: "Bestellungen", en: "Orders" },
  "admin.payments": { de: "Zahlungen", en: "Payments" },
  "admin.invoices": { de: "Rechnungen", en: "Invoices" },
  "admin.messages": { de: "Nachrichten", en: "Messages" },
  "admin.reports": { de: "Berichte", en: "Reports" },
  "admin.audit": { de: "Audit-Log", en: "Audit log" },
  "admin.shipping": { de: "Versand", en: "Shipping" },
  "admin.commissions": { de: "Provisionen", en: "Commissions" },
  "admin.notifications": { de: "Benachrichtigungen", en: "Notifications" },
  "admin.system": { de: "System & Backup", en: "System & backup" },
  "admin.profile": { de: "Profil", en: "Profile" },
};

export default function AdminStaffPage() {
  const { t } = useStore();
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; permissions: string[] }[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("ops");
  const [draft, setDraft] = useState({ name: "", email: "", password: "password", role: "support" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const role = useMemo(() => roles.find((item) => item.id === selectedRole) ?? roles[0], [roles, selectedRole]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, rolesRes] = await Promise.all([fetchStaff(), fetchRoles()]);
      setStaff(staffRes.data);
      setRoles(rolesRes.data.roles);
      setAllPermissions(rolesRes.data.permissions);
      if (!rolesRes.data.roles.some((item) => item.id === selectedRole) && rolesRes.data.roles[0]) {
        setSelectedRole(rolesRes.data.roles[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Laden fehlgeschlagen.", en: "Failed to load." }));
    } finally {
      setLoading(false);
    }
  }, [selectedRole, t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function togglePermission(permission: string) {
    if (!role || role.id === "super_admin") return;
    const next = role.permissions.includes(permission)
      ? role.permissions.filter((item) => item !== permission)
      : [...role.permissions, permission];
    try {
      const response = await updateRolePermissionsRequest(role.id, next);
      setRoles((current) => current.map((item) => (item.id === role.id ? { ...item, permissions: response.data.permissions } : item)));
      setNotice(t({ de: "Rollenrechte aktualisiert.", en: "Role permissions updated." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Update fehlgeschlagen.", en: "Update failed." }));
    }
  }

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createStaffRequest(draft);
      setDraft({ name: "", email: "", password: "password", role: "support" });
      setNotice(t({ de: "Mitarbeiter angelegt.", en: "Staff member created." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Anlegen fehlgeschlagen.", en: "Create failed." }));
    }
  }

  async function setActive(member: AuthUser, is_active: boolean) {
    try {
      await updateStaffRequest(member.id, { is_active });
      setNotice(is_active ? t({ de: "Mitarbeiter aktiv.", en: "Staff enabled." }) : t({ de: "Mitarbeiter deaktiviert.", en: "Staff disabled." }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Update fehlgeschlagen.", en: "Update failed." }));
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Mitarbeiter & Rollen", en: "Staff & roles" })}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t({
          de: "Spatie Permission über Sanctum API. Super Admin steuert Rollen und Rechte der Admin-Nutzer.",
          en: "Spatie Permission through the Sanctum API. Super Admin controls roles and permissions for admin users.",
        })}
      </p>
      {notice ? <p className="mt-3 text-sm text-ok">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ de: "Rollen & Rechte", en: "Roles & permissions" })}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedRole(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${selectedRole === item.id ? "bg-ink text-white" : "border border-line bg-paper text-ink"}`}
              >
                {t(ROLE_LABELS[item.id] ?? { de: item.name, en: item.name })}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {role?.id === "super_admin"
              ? t({ de: "Super Admin hat alle Rechte und kann nicht eingeschränkt werden.", en: "Super Admin has all permissions and cannot be restricted." })
              : t({ de: "Rechte für diese Rolle umschalten.", en: "Toggle permissions for this role." })}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {allPermissions.map((permission) => {
              const on = role?.permissions.includes(permission) ?? false;
              const locked = role?.id === "super_admin";
              return (
                <li key={permission}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => togglePermission(permission)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition ${on ? "border-copper/40 bg-[#fff6f1]" : "border-line bg-paper"} ${locked ? "cursor-default opacity-80" : "hover:border-copper/50"}`}
                  >
                    <span>{t(PERMISSION_LABELS[permission] ?? { de: permission, en: permission })}</span>
                    <span className={`text-xs font-medium ${on ? "text-copper" : "text-muted"}`}>{on ? "ON" : "OFF"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">{t({ de: "Mitarbeiter anlegen", en: "Create staff" })}</h2>
            <form onSubmit={addStaff} className="mt-4 space-y-3">
              <Field label={t({ de: "Name", en: "Name" })}>
                <input className={fieldClass} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required />
              </Field>
              <Field label={t({ de: "E-Mail", en: "Email" })}>
                <input type="email" className={fieldClass} value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} required />
              </Field>
              <Field label={t({ de: "Passwort", en: "Password" })}>
                <input className={fieldClass} value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} required />
              </Field>
              <Field label={t({ de: "Rolle", en: "Role" })}>
                <select className={fieldClass} value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>{t(ROLE_LABELS[item.id] ?? { de: item.name, en: item.name })}</option>
                  ))}
                </select>
              </Field>
              <Button type="submit">{t({ de: "Anlegen", en: "Create" })}</Button>
            </form>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">{t({ de: "Team", en: "Team" })}</h2>
            <ul className="mt-4 divide-y divide-line">
              {staff.map((member) => {
                const memberRole = member.roles[0] ?? "—";
                return (
                  <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-muted">{member.email} · {t(ROLE_LABELS[memberRole] ?? { de: memberRole, en: memberRole })}</p>
                      <p className={`mt-1 text-xs ${member.is_active ? "text-ok" : "text-danger"}`}>
                        {member.is_active ? t({ de: "Aktiv", en: "Active" }) : t({ de: "Deaktiviert", en: "Disabled" })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {member.is_active ? (
                        <Button size="sm" variant="danger" onClick={() => setActive(member, false)}>{t({ de: "Sperren", en: "Disable" })}</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setActive(member, true)}>{t({ de: "Aktivieren", en: "Enable" })}</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
