"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useStore } from "@/lib/store";

export type AdminNavIcon =
  | "home"
  | "overview"
  | "profile"
  | "content"
  | "cms"
  | "catalog"
  | "products"
  | "categories"
  | "brands"
  | "inventory"
  | "access"
  | "team"
  | "roles"
  | "trading"
  | "auctions"
  | "sellers"
  | "company-stock"
  | "customers"
  | "operations"
  | "orders"
  | "returns"
  | "payments"
  | "invoices"
  | "messages"
  | "insights"
  | "reports"
  | "audit"
  | "settings"
  | "features"
  | "shipping"
  | "commissions"
  | "notifications"
  | "stripe"
  | "ai"
  | "system";

export type AdminNavItem = { href: string; label: string; permission: string; icon: AdminNavIcon };
export type AdminNavGroup = { id: string; title: string; icon: AdminNavIcon; items: AdminNavItem[] };

function AdminIcon({ name, className }: { name: AdminNavIcon; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("h-4 w-4 shrink-0", className),
  };

  const paths: Record<AdminNavIcon, ReactNode> = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
      </>
    ),
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    content: (
      <>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
    cms: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 9h16M9 9v10" />
      </>
    ),
    catalog: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      </>
    ),
    products: (
      <>
        <path d="M3.5 8.5 12 4l8.5 4.5L12 13 3.5 8.5Z" />
        <path d="M3.5 8.5V16L12 20.5 20.5 16V8.5" />
        <path d="M12 13v7.5" />
      </>
    ),
    categories: (
      <>
        <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v7H4zM13 14h7v7h-7z" />
      </>
    ),
    brands: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8M12 8v8" />
      </>
    ),
    inventory: (
      <>
        <path d="M3 8h18v12H3z" />
        <path d="M3 8l2.5-4h13L21 8M9 12h6" />
      </>
    ),
    access: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 6.5 0" />
      </>
    ),
    roles: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
        <path d="M16.5 7.5 19 5l1.5 1.5" />
      </>
    ),
    trading: (
      <>
        <path d="M4 16h6l2-5 3 8 2-3h3" />
        <path d="M4 8h4M4 12h3" />
      </>
    ),
    auctions: (
      <>
        <path d="M12 3v11" />
        <path d="M8 7h8M7 14h10" />
        <path d="M6 21h12" />
      </>
    ),
    sellers: (
      <>
        <path d="M4 10h16l-1.5 10H5.5L4 10Z" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </>
    ),
    "company-stock": (
      <>
        <path d="M3 20h18" />
        <path d="M5 20V9l7-5 7 5v11" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    customers: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    operations: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.2M12 18.8V21M4.9 6.1l1.6 1.6M17.5 16.3l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.9l1.6-1.6M17.5 7.7l1.6-1.6" />
      </>
    ),
    orders: (
      <>
        <path d="M7 4h10l1 16H6L7 4Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    returns: (
      <>
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 4v5h5" />
      </>
    ),
    payments: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    invoices: (
      <>
        <path d="M7 3h7l5 5v13H7V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </>
    ),
    messages: (
      <>
        <path d="M4 5h16v11H8l-4 3V5Z" />
      </>
    ),
    insights: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15v-4M12 15V8M16 15v-7" />
      </>
    ),
    reports: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16l3-5 3 3 4-7" />
      </>
    ),
    audit: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4M9 11h4M11 9v4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    features: (
      <>
        <path d="M12 3l1.8 5.6H20l-4.6 3.4 1.8 5.6L12 14.8 6.8 17.6l1.8-5.6L4 8.6h6.2L12 3Z" />
      </>
    ),
    shipping: (
      <>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18.5" r="1.5" />
        <circle cx="17" cy="18.5" r="1.5" />
      </>
    ),
    commissions: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v10M9.5 9.5c.7-1 1.9-1.5 2.5-1.5s2 .6 2 1.8-1.2 1.7-2.5 2.2-2.5 1.1-2.5 2.4c0 1.3 1.2 2.1 2.5 2.1s1.9-.5 2.5-1.4" />
      </>
    ),
    notifications: (
      <>
        <path d="M6 17h12l-1.2-1.8a5.8 5.8 0 0 1-.8-3V9a4 4 0 1 0-8 0v2.2c0 1.1-.3 2.1-.8 3L6 17Z" />
        <path d="M10 17a2 2 0 0 0 4 0" />
      </>
    ),
    stripe: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 12c.8-1.2 2.2-1.2 3 0s2.2 1.2 3 0 2.2-1.2 3 0" />
      </>
    ),
    ai: (
      <>
        <path d="M12 3v3M12 18v3M4.9 6.1l2.1 2.1M17 15.8l2.1 2.1M3 12h3M18 12h3M4.9 17.9 7 15.8M17 8.2l2.1-2.1" />
        <circle cx="12" cy="12" r="3.5" />
      </>
    ),
    system: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 18v3" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function itemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

function groupContainsPath(group: AdminNavGroup, pathname: string) {
  return group.items.some((item) => itemActive(pathname, item.href));
}

export function useAdminNavGroups(): AdminNavGroup[] {
  const { t, can } = useStore();

  const groups: AdminNavGroup[] = [
    {
      id: "start",
      title: t({ de: "Start", en: "Start" }),
      icon: "home",
      items: [
        { href: "/admin", label: t({ de: "Übersicht", en: "Overview" }), permission: "admin.overview", icon: "overview" },
        { href: "/admin/profile", label: t({ de: "Profil", en: "Profile" }), permission: "admin.profile", icon: "profile" },
      ],
    },
    {
      id: "content",
      title: t({ de: "Inhalt", en: "Content" }),
      icon: "content",
      items: [{ href: "/admin/cms", label: t({ de: "Inhalte", en: "CMS" }), permission: "admin.cms", icon: "cms" }],
    },
    {
      id: "catalog",
      title: t({ de: "Katalog", en: "Catalog" }),
      icon: "catalog",
      items: [
        { href: "/admin/products", label: t({ de: "Artikel", en: "Products" }), permission: "admin.products", icon: "products" },
        { href: "/admin/categories", label: t({ de: "Kategorien", en: "Categories" }), permission: "admin.categories", icon: "categories" },
        { href: "/admin/brands", label: t({ de: "Hersteller", en: "Brands" }), permission: "admin.brands", icon: "brands" },
        { href: "/admin/inventory", label: t({ de: "Lager", en: "Inventory" }), permission: "admin.inventory", icon: "inventory" },
      ],
    },
    {
      id: "access",
      title: t({ de: "Zugang", en: "Access" }),
      icon: "access",
      items: [
        { href: "/admin/team", label: t({ de: "Team", en: "Team" }), permission: "admin.staff", icon: "team" },
        { href: "/admin/roles", label: t({ de: "Rollen & Rechte", en: "Roles & permissions" }), permission: "admin.staff", icon: "roles" },
      ],
    },
    {
      id: "trading",
      title: t({ de: "Handel", en: "Trading" }),
      icon: "trading",
      items: [
        { href: "/admin/auctions", label: t({ de: "Auktionen", en: "Auctions" }), permission: "admin.auctions", icon: "auctions" },
        { href: "/admin/sellers", label: t({ de: "Verkäufer", en: "Sellers" }), permission: "admin.sellers", icon: "sellers" },
        { href: "/admin/company-stock", label: t({ de: "Firmenlager", en: "Company stock" }), permission: "admin.company_stock", icon: "company-stock" },
        { href: "/admin/customers", label: t({ de: "Kunden", en: "Customers" }), permission: "admin.customers", icon: "customers" },
      ],
    },
    {
      id: "operations",
      title: t({ de: "Betrieb", en: "Operations" }),
      icon: "operations",
      items: [
        { href: "/admin/orders", label: t({ de: "Bestellungen", en: "Orders" }), permission: "admin.orders", icon: "orders" },
        { href: "/admin/returns", label: t({ de: "Retouren", en: "Returns" }), permission: "admin.orders", icon: "returns" },
        { href: "/admin/payments", label: t({ de: "Zahlungen", en: "Payments" }), permission: "admin.payments", icon: "payments" },
        { href: "/admin/invoices", label: t({ de: "Rechnungen", en: "Invoices" }), permission: "admin.invoices", icon: "invoices" },
        { href: "/admin/messages", label: t({ de: "Nachrichten", en: "Messages" }), permission: "admin.messages", icon: "messages" },
      ],
    },
    {
      id: "insights",
      title: t({ de: "Auswertung", en: "Insights" }),
      icon: "insights",
      items: [
        { href: "/admin/reports", label: t({ de: "Berichte", en: "Reports" }), permission: "admin.reports", icon: "reports" },
        { href: "/admin/audit", label: t({ de: "Audit-Log", en: "Audit log" }), permission: "admin.audit", icon: "audit" },
      ],
    },
    {
      id: "settings",
      title: t({ de: "Einstellungen", en: "Settings" }),
      icon: "settings",
      items: [
        { href: "/admin/features", label: t({ de: "Funktionen", en: "Features" }), permission: "admin.features", icon: "features" },
        { href: "/admin/shipping", label: t({ de: "Versand", en: "Shipping" }), permission: "admin.shipping", icon: "shipping" },
        { href: "/admin/commissions", label: t({ de: "Provisionen", en: "Commissions" }), permission: "admin.commissions", icon: "commissions" },
        { href: "/admin/notifications", label: t({ de: "Benachrichtigungen", en: "Notifications" }), permission: "admin.notifications", icon: "notifications" },
        { href: "/admin/stripe", label: t({ de: "Stripe", en: "Stripe" }), permission: "admin.payments", icon: "stripe" },
        { href: "/admin/ai", label: t({ en: "AI agent" }), permission: "admin.system", icon: "ai" },
        { href: "/admin/system", label: t({ de: "System & Sicherung", en: "System & backup" }), permission: "admin.system", icon: "system" },
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
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    const activeId = groups.find((group) => groupContainsPath(group, pathname))?.id;
    if (!activeId) return;
    setOpenIds((prev) => (prev.includes(activeId) ? prev : [...prev, activeId]));
  }, [pathname, groups]);

  function toggle(id: string) {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <nav className="space-y-1">
      {groups.map((group) => {
        const open = openIds.includes(group.id);
        const sectionActive = groupContainsPath(group, pathname);

        return (
          <div key={group.id} className="rounded-2xl">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={open}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition",
                sectionActive ? "bg-paper text-ink" : "text-ink/80 hover:bg-paper hover:text-ink",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <AdminIcon name={group.icon} className={sectionActive ? "text-copper" : "text-muted"} />
                <span className="truncate">{group.title}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full text-[10px] text-muted transition-transform duration-200",
                  open && "rotate-180",
                  sectionActive && "text-copper",
                )}
              >
                ▾
              </span>
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <ul className="mt-1 mb-2 ml-3 space-y-0.5 border-l border-line pl-2">
                  {group.items.map((item) => {
                    const active = itemActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                            active ? "bg-ink font-medium text-white" : "text-ink/70 hover:bg-paper hover:text-ink",
                          )}
                        >
                          <AdminIcon name={item.icon} className={active ? "text-white/90" : "text-muted"} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
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
            <div className="mt-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              <NavList groups={groups} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label={t({ de: "Schließen", en: "Close" })} onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[min(100%,20rem)] flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">{t({ de: "Verwaltung", en: "Admin" })}</span>
              <Button variant="secondary" size="icon" aria-label={t({ de: "Schließen", en: "Close" })} onClick={() => setOpen(false)}>×</Button>
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
