"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useStore } from "@/lib/store";

export type AdminNavItem = { href: string; label: string; permission: string };
export type AdminNavGroup = { title: string; items: AdminNavItem[] };

export function useAdminNavGroups(): AdminNavGroup[] {
  const { t, can } = useStore();

  const groups: AdminNavGroup[] = [
    {
      title: t({ de: "Start", en: "Start" }),
      items: [
        { href: "/admin", label: t({ de: "Übersicht", en: "Overview" }), permission: "admin.overview" },
        { href: "/admin/features", label: t({ de: "Funktionen", en: "Features" }), permission: "admin.features" },
        { href: "/admin/profile", label: t({ de: "Profil", en: "Profile" }), permission: "admin.profile" },
      ],
    },
    {
      title: t({ de: "Inhalt", en: "Content" }),
      items: [{ href: "/admin/cms", label: t({ de: "CMS", en: "CMS" }), permission: "admin.cms" }],
    },
    {
      title: t({ de: "Katalog", en: "Catalog" }),
      items: [
        { href: "/admin/products", label: t({ de: "Artikel", en: "Products" }), permission: "admin.products" },
        { href: "/admin/categories", label: t({ de: "Kategorien", en: "Categories" }), permission: "admin.categories" },
        { href: "/admin/brands", label: t({ de: "Hersteller", en: "Brands" }), permission: "admin.brands" },
        { href: "/admin/inventory", label: t({ de: "Lager", en: "Inventory" }), permission: "admin.inventory" },
      ],
    },
    {
      title: t({ de: "Handel", en: "Trading" }),
      items: [
        { href: "/admin/auctions", label: t({ de: "Auktionen", en: "Auctions" }), permission: "admin.auctions" },
        { href: "/admin/sellers", label: t({ de: "Verkäufer", en: "Sellers" }), permission: "admin.sellers" },
        { href: "/admin/customers", label: t({ de: "Kunden", en: "Customers" }), permission: "admin.customers" },
        { href: "/admin/staff", label: t({ de: "Rollen & Rechte", en: "Roles & permissions" }), permission: "admin.staff" },
      ],
    },
    {
      title: t({ de: "Betrieb", en: "Operations" }),
      items: [
        { href: "/admin/orders", label: t({ de: "Bestellungen", en: "Orders" }), permission: "admin.orders" },
        { href: "/admin/returns", label: t({ de: "Retouren", en: "Returns" }), permission: "admin.orders" },
        { href: "/admin/payments", label: t({ de: "Zahlungen", en: "Payments" }), permission: "admin.payments" },
        { href: "/admin/invoices", label: t({ de: "Rechnungen", en: "Invoices" }), permission: "admin.invoices" },
        { href: "/admin/messages", label: t({ de: "Nachrichten", en: "Messages" }), permission: "admin.messages" },
      ],
    },
    {
      title: t({ de: "Auswertung", en: "Insights" }),
      items: [
        { href: "/admin/reports", label: t({ de: "Berichte", en: "Reports" }), permission: "admin.reports" },
        { href: "/admin/audit", label: t({ de: "Audit-Log", en: "Audit log" }), permission: "admin.audit" },
      ],
    },
    {
      title: t({ de: "Einstellungen", en: "Settings" }),
      items: [
        { href: "/admin/shipping", label: t({ de: "Versand", en: "Shipping" }), permission: "admin.shipping" },
        { href: "/admin/commissions", label: t({ de: "Provisionen", en: "Commissions" }), permission: "admin.commissions" },
        { href: "/admin/notifications", label: t({ de: "Benachrichtigungen", en: "Notifications" }), permission: "admin.notifications" },
        { href: "/admin/system", label: t({ de: "System & Backup", en: "System & backup" }), permission: "admin.system" },
      ],
    },
  ];

  return useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => can(item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, can],
  );
}

function NavList({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{group.title}</p>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-ink font-medium text-white" : "text-ink/75 hover:bg-paper hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AdminAvatar() {
  const { profile } = useStore();
  if (profile.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
    );
  }
  return (
    <span className="bg-accent-gradient grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white">
      {(profile.name || "A").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t, profile, authUser } = useStore();
  const groups = useAdminNavGroups();
  const [open, setOpen] = useState(false);
  const roleLabel = authUser?.roles?.[0] ?? "admin";

  return (
    <div className="mx-auto w-full flex-1 px-3 py-6 sm:px-4 lg:px-6">
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-3">
          <AdminAvatar />
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Verwaltung", en: "Admin" })}</p>
            <p className="text-sm text-muted">{profile.name || roleLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminNotificationBell />
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>{t({ de: "Menü", en: "Menu" })}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-3xl border border-line bg-white p-4 shadow-[0_16px_40px_-28px_rgba(18,18,18,0.45)]">
            <div className="mb-4 flex items-center gap-2">
              <Link href="/admin/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-paper">
                <AdminAvatar />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{profile.name || t({ de: "Admin", en: "Admin" })}</span>
                  <span className="block truncate text-xs text-muted">{profile.email || roleLabel}</span>
                </span>
              </Link>
              <AdminNotificationBell />
            </div>
            <p className="px-3 text-xs font-semibold tracking-[0.14em] text-copper uppercase">{t({ de: "Verwaltung", en: "Admin" })}</p>
            <div className="mt-5 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              <NavList groups={groups} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[min(100%,20rem)] flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">{t({ de: "Verwaltung", en: "Admin" })}</span>
              <Button variant="secondary" size="icon" aria-label="Close" onClick={() => setOpen(false)}>×</Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList groups={groups} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPlaceholder({ title, blurb }: { title: string; blurb?: string }) {
  const { t } = useStore();
  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        {blurb ?? t({ de: "Dieser Bereich ist in der Vorschau vorbereitet. Inhalt folgt in einer späteren Phase.", en: "This section is reserved in the preview. Content comes in a later phase." })}
      </p>
      <div className="mt-8 rounded-3xl border border-dashed border-line bg-white p-8 text-sm text-muted">
        {t({ de: "Platzhalter für die Kundenpräsentation — noch ohne API.", en: "Placeholder for the client preview — no API yet." })}
      </div>
    </AdminShell>
  );
}
