"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export function Dropdown({
  label,
  children,
  align = "start",
  plain = false,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  plain?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const closeTimer = useRef<number | null>(null);

  function clearClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  function openMenu() {
    clearClose();
    setOpen(true);
  }

  function closeSoon() {
    if (!plain) return;
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)} onMouseEnter={plain ? openMenu : undefined} onMouseLeave={closeSoon}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-2 text-sm transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
          plain
            ? cn(
                "rounded-full border border-line bg-white px-3.5 font-medium text-ink shadow-[0_1px_2px_rgba(18,18,18,0.06),0_8px_16px_-12px_rgba(18,18,18,0.35)] hover:-translate-y-px hover:border-copper/50 hover:text-copper hover:shadow-[0_10px_22px_-12px_rgba(255,77,0,0.55)]",
                open && "-translate-y-px border-copper/60 text-copper shadow-[0_10px_22px_-12px_rgba(255,77,0,0.55)]",
              )
            : "w-full rounded-xl border border-line bg-white px-3 font-medium text-ink shadow-sm hover:border-copper/40 hover:shadow-md",
        )}
      >
        <span className="truncate">{label}</span>
        <svg viewBox="0 0 20 20" className={cn("h-4 w-4 shrink-0 transition duration-150", open ? "rotate-180 text-copper" : "text-muted")} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-56 rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(18,18,18,0.38),0_2px_6px_rgba(18,18,18,0.06)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <span className={cn("absolute -top-1.5 h-3 w-3 rotate-45 border-t border-l border-line bg-white", align === "end" ? "right-5" : "left-5")} aria-hidden />
          <div className="relative" onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MenuLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} role="menuitem" className={cn("block rounded-xl px-3 py-2 text-sm text-ink/80 transition hover:bg-[#fff1e8] hover:text-copper", active && "bg-[#fff1e8] font-medium text-copper")}>
      {children}
    </Link>
  );
}

export function MenuButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cn("block w-full rounded-xl px-3 py-2 text-left text-sm text-ink/80 transition hover:bg-[#fff1e8] hover:text-copper", active && "bg-[#fff1e8] font-medium text-copper")}>
      {children}
    </button>
  );
}

export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const current = options.find((option) => option.value === value)?.label ?? label;
  return (
    <Dropdown className={className} label={label ? `${label}: ${current}` : current}>
      {options.map((option) => (
        <MenuButton key={option.value} active={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </MenuButton>
      ))}
    </Dropdown>
  );
}
