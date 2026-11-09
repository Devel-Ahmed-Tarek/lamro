"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export function Desk({ title, items, children }: { title: string; items: { href: string; label: string }[]; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid w-full flex-1 gap-8 px-3 py-10 sm:px-4 lg:grid-cols-[220px_1fr] lg:px-6">
      <aside>
        <p className="text-xs tracking-[0.16em] text-copper uppercase">{title}</p>
        <nav className="mt-4 flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "font-semibold" : "text-muted"}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}

export function useCustomerNav() {
  const { t } = useStore();
  return [
    { href: "/account", label: t({ de: "Übersicht", en: "Overview" }) },
    { href: "/account/orders", label: t({ de: "Bestellungen", en: "Orders" }) },
    { href: "/account/won", label: t({ de: "Gewonnene Auktionen", en: "Won auctions" }) },
    { href: "/account/bids", label: t({ de: "Gebote", en: "Bids" }) },
    { href: "/account/watchlist", label: t({ de: "Merkliste", en: "Watchlist" }) },
    { href: "/account/invoices", label: t({ de: "Rechnungen", en: "Invoices" }) },
    { href: "/account/messages", label: t({ de: "Nachrichten", en: "Messages" }) },
    { href: "/account/inquiries", label: t({ de: "Artikelanfragen", en: "Inquiries" }) },
    { href: "/account/returns", label: t({ de: "Retouren", en: "Returns" }) },
  ];
}

export function useSellerNav() {
  const { t } = useStore();
  return [
    { href: "/seller", label: t({ de: "Übersicht", en: "Overview" }) },
    { href: "/seller/new", label: t({ de: "Auktion anlegen", en: "Create auction" }) },
    { href: "/seller/sales", label: t({ de: "Verkäufe", en: "Sales" }) },
    { href: "/seller/inquiries", label: t({ de: "Anfragen", en: "Inquiries" }) },
    { href: "/seller/commissions", label: t({ de: "Provisionen", en: "Commissions" }) },
  ];
}

export function useAdminNav() {
  const { t } = useStore();
  return [
    { href: "/admin", label: t({ de: "Übersicht", en: "Overview" }) },
    { href: "/admin/features", label: t({ de: "Funktionen", en: "Features" }) },
    { href: "/admin/products", label: t({ de: "Artikel", en: "Products" }) },
    { href: "/admin/inventory", label: t({ de: "Lager", en: "Inventory" }) },
    { href: "/admin/auctions", label: t({ de: "Auktionen", en: "Auctions" }) },
    { href: "/admin/sellers", label: t({ de: "Verkäufer", en: "Sellers" }) },
  ];
}
