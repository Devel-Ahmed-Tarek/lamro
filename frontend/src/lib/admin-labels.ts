export const ROLE_LABELS: Record<string, { de: string; en: string }> = {
  super_admin: { de: "Superadministrator", en: "Super Admin" },
  ops: { de: "Betrieb", en: "Operations" },
  catalog: { de: "Katalog", en: "Catalog" },
  support: { de: "Kundensupport", en: "Support" },
};

export const PERMISSION_LABELS: Record<string, { de: string; en: string }> = {
  "admin.overview": { de: "Übersicht", en: "Overview" },
  "admin.features": { de: "Funktionen", en: "Features" },
  "admin.cms": { de: "Inhalte", en: "CMS" },
  "admin.products": { de: "Artikel", en: "Products" },
  "admin.categories": { de: "Kategorien", en: "Categories" },
  "admin.brands": { de: "Hersteller", en: "Brands" },
  "admin.inventory": { de: "Lager", en: "Inventory" },
  "admin.auctions": { de: "Auktionen", en: "Auctions" },
  "admin.sellers": { de: "Verkäufer", en: "Sellers" },
  "admin.company_stock": { de: "Firmenlager", en: "Company stock" },
  "admin.customers": { de: "Kunden", en: "Customers" },
  "admin.staff": { de: "Team & Rollen", en: "Team & roles" },
  "admin.orders": { de: "Bestellungen", en: "Orders" },
  "admin.payments": { de: "Zahlungen", en: "Payments" },
  "admin.invoices": { de: "Rechnungen", en: "Invoices" },
  "admin.messages": { de: "Nachrichten", en: "Messages" },
  "admin.reports": { de: "Berichte", en: "Reports" },
  "admin.audit": { de: "Audit-Log", en: "Audit log" },
  "admin.shipping": { de: "Versand", en: "Shipping" },
  "admin.commissions": { de: "Provisionen", en: "Commissions" },
  "admin.notifications": { de: "Benachrichtigungen", en: "Notifications" },
  "admin.system": { de: "System & Sicherung", en: "System & backup" },
  "admin.profile": { de: "Profil", en: "Profile" },
};

export function roleLabel(id: string) {
  return ROLE_LABELS[id] ?? { de: id.replaceAll("_", " "), en: id.replaceAll("_", " ") };
}
