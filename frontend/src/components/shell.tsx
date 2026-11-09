"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dropdown, MenuButton, MenuLink } from "@/components/ui/dropdown";
import { usePublicBrands, usePublicCategories } from "@/hooks/use-public-catalog";
import { useStore } from "@/lib/store";

const direct = [
  { href: "/store", de: "Shop", en: "Store", feature: "store" as const },
  { href: "/auctions", de: "Auktionen", en: "Auctions", feature: "auctions" as const },
];

const company = [
  { href: "/about", de: "Über uns", en: "About" },
  { href: "/services", de: "Leistungen", en: "Services" },
  { href: "/contact", de: "Kontakt", en: "Contact" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, role, setRole, cart, features, t, profile, logoutAuth } = useStore();
  const { categories } = usePublicCategories();
  const { brands } = usePublicBrands();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const count = mounted ? cart.reduce((sum, line) => sum + line.qty, 0) : 0;
  const activeRole = mounted ? role : null;
  const de = locale === "de";
  const accountHref = activeRole === "admin" ? "/admin" : activeRole === "seller" ? "/seller" : "/account";
  const links = direct.filter((item) => !mounted || features[item.feature]);

  function search(event: React.FormEvent) {
    event.preventDefault();
    router.push(query ? `/store?q=${encodeURIComponent(query)}` : "/store");
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full items-center gap-3 px-3 sm:px-4 lg:px-6">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" /></svg>
          </button>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-accent-gradient grid h-8 w-8 place-items-center rounded-lg text-sm text-white">J</span>
            <span className="hidden sm:inline">Jala</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={active ? "rounded-lg bg-paper px-3 py-2 text-sm font-medium" : "rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-paper hover:text-ink"}>
                  {de ? item.de : item.en}
                </Link>
              );
            })}
            <Dropdown plain label={de ? "Kategorien" : "Categories"}>
              {categories.map((item) => (
                <MenuLink key={item.slug} href={`/store?category=${item.slug}`}>{t(item.name)}</MenuLink>
              ))}
              <MenuLink href="/categories">{de ? "Alle Kategorien" : "All categories"}</MenuLink>
            </Dropdown>
            <Dropdown plain label={de ? "Hersteller" : "Brands"}>
              {brands.map((brand) => (
                <MenuLink key={brand.slug} href={`/store?brand=${encodeURIComponent(brand.name)}`}>{brand.name}</MenuLink>
              ))}
              <MenuLink href="/brands">{de ? "Alle Hersteller" : "All brands"}</MenuLink>
            </Dropdown>
            <Dropdown plain label={de ? "Unternehmen" : "Company"}>
              {company.map((item) => (
                <MenuLink key={item.href} href={item.href} active={pathname.startsWith(item.href)}>{de ? item.de : item.en}</MenuLink>
              ))}
            </Dropdown>
          </nav>
          <form onSubmit={search} className="ml-auto hidden min-w-0 flex-1 md:block lg:max-w-sm">
            <label className="relative block">
              <span className="sr-only">{de ? "Suche" : "Search"}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={de ? "Teilenummer oder Name" : "Part number or name"} className="h-10 w-full rounded-lg border border-line bg-paper pr-3 pl-9 text-sm outline-none focus:border-copper focus:bg-white focus:ring-2 focus:ring-copper/20" />
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-2.5 left-3 h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8.5" cy="8.5" r="5" /><path d="M12.5 12.5 16.5 16.5" /></svg>
            </label>
          </form>
          <Dropdown plain className="hidden sm:block" align="end" label={locale === "de" ? "DE" : "EN"}>
            <MenuButton active={locale === "de"} onClick={() => setLocale("de")}>Deutsch</MenuButton>
            <MenuButton active={locale === "en"} onClick={() => setLocale("en")}>English</MenuButton>
          </Dropdown>
          <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white shadow-[0_1px_2px_rgba(18,18,18,0.06),0_8px_16px_-12px_rgba(18,18,18,0.35)] transition duration-150 hover:-translate-y-px hover:border-copper/50 hover:text-copper hover:shadow-[0_10px_22px_-12px_rgba(255,77,0,0.55)]" aria-label={de ? "Warenkorb" : "Cart"}>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5h1.2l1.2 8h8.2l1.4-5.5H7" /><circle cx="8.2" cy="16" r="1" /><circle cx="14" cy="16" r="1" /></svg>
            {count ? <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1 text-[11px] font-medium text-white">{count}</span> : null}
          </Link>
          {activeRole ? (
            <Dropdown
              plain
              className="hidden sm:block"
              align="end"
              label={
                <span className="inline-flex items-center gap-2">
                  {profile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="bg-accent-gradient grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white">
                      {(profile.name || "A").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-28 truncate">{profile.name || (de ? "Konto" : "Account")}</span>
                </span>
              }
            >
              <MenuLink href={accountHref}>{de ? "Übersicht" : "Overview"}</MenuLink>
              {activeRole === "admin" ? <MenuLink href="/admin/profile">{de ? "Profil" : "Profile"}</MenuLink> : null}
              {activeRole === "admin" ? <MenuLink href="/admin/staff">{de ? "Rollen & Rechte" : "Roles & permissions"}</MenuLink> : null}
              <MenuButton onClick={async () => {
                if (activeRole === "admin") await logoutAuth();
                else setRole(null);
                router.push("/");
              }}>{de ? "Abmelden" : "Log out"}</MenuButton>
            </Dropdown>
          ) : (
            <ButtonLink href="/login" size="sm" className="hidden sm:inline-flex">{de ? "Anmelden" : "Log in"}</ButtonLink>
          )}
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[min(100%,20rem)] flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Jala</span>
              <Button variant="secondary" size="icon" aria-label="Close" onClick={() => setOpen(false)}>×</Button>
            </div>
            <form onSubmit={search} className="mt-4">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={de ? "Suche" : "Search"} className="h-10 w-full rounded-lg border border-line px-3 text-sm" />
            </form>
            <nav className="mt-4 flex flex-col gap-2">
              {links.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">{de ? item.de : item.en}</Link>
              ))}
              <Dropdown label={de ? "Kategorien" : "Categories"}>
                {categories.map((item) => <MenuLink key={item.slug} href={`/store?category=${item.slug}`}>{t(item.name)}</MenuLink>)}
                <MenuLink href="/categories">{de ? "Alle Kategorien" : "All categories"}</MenuLink>
              </Dropdown>
              <Dropdown label={de ? "Hersteller" : "Brands"}>
                {brands.map((brand) => <MenuLink key={brand.slug} href={`/store?brand=${encodeURIComponent(brand.name)}`}>{brand.name}</MenuLink>)}
                <MenuLink href="/brands">{de ? "Alle Hersteller" : "All brands"}</MenuLink>
              </Dropdown>
              <Dropdown label={de ? "Unternehmen" : "Company"}>
                {company.map((item) => <MenuLink key={item.href} href={item.href}>{de ? item.de : item.en}</MenuLink>)}
              </Dropdown>
              <Dropdown label={locale === "de" ? "Deutsch" : "English"}>
                <MenuButton active={locale === "de"} onClick={() => setLocale("de")}>Deutsch</MenuButton>
                <MenuButton active={locale === "en"} onClick={() => setLocale("en")}>English</MenuButton>
              </Dropdown>
            </nav>
            <div className="mt-auto">
              {activeRole ? <ButtonLink href={accountHref} className="w-full">{de ? "Konto" : "Account"}</ButtonLink> : <ButtonLink href="/login" className="w-full">{de ? "Anmelden" : "Log in"}</ButtonLink>}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mt-16 border-t border-line bg-white">
        <div className="mx-auto grid w-full gap-8 px-3 py-12 sm:px-4 md:grid-cols-4 lg:px-6">
          <div>
            <p className="font-semibold">Jala</p>
            <p className="mt-3 text-sm text-muted">{de ? "Industrieelektronik, Ersatzteile und geprüfte Komponenten." : "Industrial electronics, spare parts, and tested components."}</p>
          </div>
          {[
            { title: de ? "Handel" : "Trade", items: [{ href: "/store", label: "Shop" }, { href: "/auctions", label: de ? "Auktionen" : "Auctions" }, { href: "/categories", label: de ? "Kategorien" : "Categories" }] },
            { title: de ? "Unternehmen" : "Company", items: company.map((item) => ({ href: item.href, label: de ? item.de : item.en })) },
            { title: de ? "Rechtliches" : "Legal", items: [
              { href: "/legal/impressum", label: "Impressum" },
              { href: "/legal/privacy", label: de ? "Datenschutz" : "Privacy" },
              { href: "/legal/terms", label: de ? "AGB" : "Terms" },
              { href: "/legal/cookies", label: "Cookies" },
              { href: "/legal/auctions", label: de ? "Auktionsbedingungen" : "Auction terms" },
            ] },
          ].map((column) => (
            <div key={column.title} className="text-sm">
              <p className="font-medium">{column.title}</p>
              <div className="mt-3 flex flex-col gap-2 text-muted">
                {column.items.map((item) => <Link key={item.href} href={item.href} className="hover:text-ink">{item.label}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full flex-1 px-3 py-8 sm:px-4 sm:py-10 lg:px-6">{children}</div>;
}
