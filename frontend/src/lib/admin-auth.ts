import type { Role } from "@/lib/store";

export type PermissionKey =
  | "overview"
  | "features"
  | "cms"
  | "products"
  | "categories"
  | "brands"
  | "inventory"
  | "auctions"
  | "sellers"
  | "customers"
  | "staff"
  | "orders"
  | "payments"
  | "invoices"
  | "messages"
  | "reports"
  | "audit"
  | "shipping"
  | "commissions"
  | "notifications"
  | "system"
  | "profile";

export const ALL_PERMISSIONS: PermissionKey[] = [
  "overview",
  "features",
  "cms",
  "products",
  "categories",
  "brands",
  "inventory",
  "auctions",
  "sellers",
  "customers",
  "staff",
  "orders",
  "payments",
  "invoices",
  "messages",
  "reports",
  "audit",
  "shipping",
  "commissions",
  "notifications",
  "system",
  "profile",
];

export const PERMISSION_LABELS: Record<PermissionKey, { de: string; en: string }> = {
  overview: { de: "Übersicht", en: "Overview" },
  features: { de: "Funktionen", en: "Features" },
  cms: { de: "CMS", en: "CMS" },
  products: { de: "Artikel", en: "Products" },
  categories: { de: "Kategorien", en: "Categories" },
  brands: { de: "Hersteller", en: "Brands" },
  inventory: { de: "Lager", en: "Inventory" },
  auctions: { de: "Auktionen", en: "Auctions" },
  sellers: { de: "Verkäufer", en: "Sellers" },
  customers: { de: "Kunden", en: "Customers" },
  staff: { de: "Mitarbeiter & Rollen", en: "Staff & roles" },
  orders: { de: "Bestellungen", en: "Orders" },
  payments: { de: "Zahlungen", en: "Payments" },
  invoices: { de: "Rechnungen", en: "Invoices" },
  messages: { de: "Nachrichten", en: "Messages" },
  reports: { de: "Berichte", en: "Reports" },
  audit: { de: "Audit-Log", en: "Audit log" },
  shipping: { de: "Versand", en: "Shipping" },
  commissions: { de: "Provisionen", en: "Commissions" },
  notifications: { de: "Benachrichtigungen", en: "Notifications" },
  system: { de: "System & Backup", en: "System & backup" },
  profile: { de: "Profil", en: "Profile" },
};

export type StaffRoleId = "super_admin" | "ops" | "catalog" | "support";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  roleId: StaffRoleId;
  active: boolean;
  avatar?: string;
};

export type StaffRole = {
  id: StaffRoleId;
  name: { de: string; en: string };
  permissions: PermissionKey[];
};

export const defaultRoles: StaffRole[] = [
  {
    id: "super_admin",
    name: { de: "Super Admin", en: "Super Admin" },
    permissions: [...ALL_PERMISSIONS],
  },
  {
    id: "ops",
    name: { de: "Betrieb", en: "Operations" },
    permissions: ["overview", "orders", "payments", "invoices", "shipping", "reports", "audit", "profile"],
  },
  {
    id: "catalog",
    name: { de: "Katalog", en: "Catalog" },
    permissions: ["overview", "products", "categories", "brands", "inventory", "auctions", "profile"],
  },
  {
    id: "support",
    name: { de: "Support", en: "Support" },
    permissions: ["overview", "customers", "messages", "orders", "profile"],
  },
];

export const defaultStaff: StaffMember[] = [
  {
    id: "1",
    name: "Jala Admin",
    email: "admin@jala.de",
    roleId: "super_admin",
    active: true,
  },
  {
    id: "2",
    name: "Lea Hoffmann",
    email: "lea@jala.de",
    roleId: "ops",
    active: true,
  },
  {
    id: "3",
    name: "Mark Weber",
    email: "mark@jala.de",
    roleId: "catalog",
    active: true,
  },
];

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  avatar: string;
};

export const defaultAdminProfile: UserProfile = {
  name: "Jala Admin",
  email: "admin@jala.de",
  phone: "+49 221 000000",
  avatar: "",
};

/** Demo accounts for the UI preview (no real auth). */
export function resolveLogin(email: string, password: string): { role: Role; profile: UserProfile } | null {
  const normalized = email.trim().toLowerCase();
  if (!password) return null;

  if (normalized === "admin@jala.de" && password === "admin") {
    return { role: "admin", profile: { ...defaultAdminProfile } };
  }
  if (normalized === "seller@jala.de" && password === "seller") {
    return {
      role: "seller",
      profile: { name: "Nordwerk Automation", email: normalized, phone: "", avatar: "" },
    };
  }
  if ((normalized === "customer@jala.de" || normalized.includes("@")) && password.length >= 4) {
    if (normalized === "admin@jala.de" || normalized === "seller@jala.de") return null;
    return {
      role: "customer",
      profile: { name: "Demo Kunde", email: normalized, phone: "", avatar: "" },
    };
  }
  return null;
}
