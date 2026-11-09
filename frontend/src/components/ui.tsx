"use client";

import Link from "next/link";
import type { Condition, Copy, Testing } from "@/lib/catalog";
import { cn } from "@/components/ui/cn";
import { useStore } from "@/lib/store";

export { Button, ButtonLink, buttonClass } from "@/components/ui/button";
export { Dropdown, MenuButton, MenuLink, SelectMenu } from "@/components/ui/dropdown";
export { Field, TextInput, fieldClass } from "@/components/ui/field";

const conditionCopy: Record<Condition, Copy> = {
  new: { de: "Neu", en: "New" },
  used: { de: "Gebraucht", en: "Used" },
  refurbished: { de: "Generalüberholt", en: "Refurbished" },
  parts: { de: "Für Teile", en: "For parts" },
};

const testingCopy: Record<Testing, Copy> = {
  tested: { de: "Geprüft & funktionsfähig", en: "Tested & working" },
  working: { de: "Funktionsfähig laut Verkäufer", en: "Working per seller" },
  untested: { de: "Ungeprüft", en: "Untested" },
  defective: { de: "Defekt", en: "Defective" },
  partial: { de: "Teilweise funktionsfähig", en: "Partially working" },
  unknown: { de: "Unbekannt", en: "Unknown" },
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "danger" | "ok" }) {
  const tones = {
    neutral: "bg-paper text-ink",
    accent: "bg-copper/10 text-copper",
    danger: "bg-danger/10 text-danger",
    ok: "bg-ok/10 text-ok",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function ConditionBadge({ value }: { value: Condition }) {
  const { t } = useStore();
  return <Badge tone={value === "parts" ? "danger" : "ok"}>{t(conditionCopy[value])}</Badge>;
}

export function TestingBadge({ value }: { value: Testing }) {
  const { t } = useStore();
  const tone = value === "defective" || value === "partial" ? "danger" : value === "untested" || value === "unknown" ? "accent" : "neutral";
  return <Badge tone={tone}>{t(testingCopy[value])}</Badge>;
}

export function Plate({ brand, part }: { brand: string; part: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col justify-between bg-[linear-gradient(160deg,#fff1e8,#f7f7f8)] p-4">
      <span className="text-xs font-medium text-muted">{brand}</span>
      <span className="font-mono text-sm leading-5 text-ink">{part}</span>
    </div>
  );
}

export function PageIntro({ kicker, title, lede }: { kicker: string; title: string; lede?: string }) {
  return (
    <header>
      <p className="text-sm font-medium text-copper">{kicker}</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {lede ? <p className="mt-3 max-w-2xl text-muted">{lede}</p> : null}
    </header>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">{children}</p>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-medium text-copper underline-offset-4 hover:underline">{children}</Link>;
}
