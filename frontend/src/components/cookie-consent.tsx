"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "jala-cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || typeof document === "undefined") return;
  if (document.getElementById("jala-ga")) return;
  const script = document.createElement("script");
  script.id = "jala-ga";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
}

export function CookieConsent() {
  const { t } = useStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "accepted") {
      loadAnalytics();
      return;
    }
    if (saved === "rejected") return;
    setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
    loadAnalytics();
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 p-4 shadow-[0_-12px_40px_-24px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {t({
            en: "We use essential cookies to run the shop. Analytics cookies load only after you accept.",
          })}{" "}
          <Link href="/legal/cookies" className="text-copper">
            {t({ en: "Cookies" })}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" onClick={reject}>
            {t({ en: "Reject" })}
          </Button>
          <Button type="button" variant="accent" onClick={accept}>
            {t({ en: "Accept cookies" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
