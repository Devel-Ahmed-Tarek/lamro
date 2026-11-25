export const LOCALES = ["ar", "en", "de", "fr", "it", "es", "tr", "nl", "pl", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export type Copy = Partial<Record<Locale, string>>;

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  tr: "Türkçe",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
};

export function emptyCopy(): Copy {
  return Object.fromEntries(LOCALES.map((locale) => [locale, ""])) as Copy;
}

export function pickCopy(copy: Copy | Record<string, string | undefined> | undefined, locale: Locale): string {
  if (!copy) return "";
  return (
    copy[locale] ||
    copy.en ||
    copy.de ||
    copy.ar ||
    Object.values(copy).find((value) => typeof value === "string" && value.trim()) ||
    ""
  );
}

export type Condition = "new" | "used" | "refurbished" | "parts";
export type Testing = "tested" | "working" | "untested" | "defective" | "partial" | "unknown";

export type Product = {
  slug: string;
  name: Copy;
  summary: Copy;
  manufacturer: string;
  partNumber: string;
  model: string;
  sku: string;
  serial: string;
  condition: Condition;
  testing: Testing;
  price: number;
  stock: number;
  category: string;
  weight: string;
  dimensions: string;
  notes: Copy;
  specs: { label: Copy; value: string }[];
};

export type Auction = {
  slug: string;
  productSlug: string;
  seller: "jala" | "external";
  sellerName: string;
  type: "live" | "scheduled" | "timed";
  status: "live" | "upcoming" | "ended";
  startingPrice: number;
  currentBid: number;
  increment: number;
  buyNow: number | null;
  hasReserve: boolean;
  endsInMinutes: number;
  bids: { bidder: string; amount: number; ago: Copy }[];
};

export const categories: { slug: string; name: Copy; count: number }[] = [
  { slug: "drives", name: { de: "Antriebe & Umrichter", en: "Drives & inverters" }, count: 3 },
  { slug: "plc", name: { de: "Steuerungen", en: "PLCs" }, count: 1 },
  { slug: "hmi", name: { de: "Bedienpanels", en: "HMI panels" }, count: 1 },
  { slug: "switchgear", name: { de: "Schaltgeräte", en: "Switchgear" }, count: 2 },
  { slug: "servo", name: { de: "Servo & CNC", en: "Servo & CNC" }, count: 1 },
  { slug: "spares", name: { de: "Ersatzteile", en: "Spare parts" }, count: 1 },
];

export const brands = ["Siemens", "ABB", "Schneider Electric", "Allen-Bradley", "Fanuc", "Lenze"];

export const products: Product[] = [];

/** @deprecated Demo auction fixtures removed — use auction API. */
export const auctions: Auction[] = [];

export function productBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function auctionBySlug(slug: string) {
  return auctions.find((auction) => auction.slug === slug);
}

const moneyLocales: Record<Locale, string> = {
  ar: "ar",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  tr: "tr-TR",
  nl: "nl-NL",
  pl: "pl-PL",
  pt: "pt-PT",
};

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(moneyLocales[locale] ?? "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
