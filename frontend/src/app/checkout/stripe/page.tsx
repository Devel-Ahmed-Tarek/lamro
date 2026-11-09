"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Button, Notice, PageIntro } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/catalog";
import { completeStripeDemo, syncStripeSession, type ApiOrder } from "@/lib/commerce-api";
import { useStore } from "@/lib/store";

function StripeCheckoutInner() {
  const { t, locale, authUser } = useStore();
  const search = useSearchParams();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const paymentId = Number(search.get("payment") || 0);
  const token = search.get("token") || "";
  const demo = search.get("demo") === "1";
  const sessionId = search.get("session_id") || "";
  const success = search.get("success") === "1";
  const cancelled = search.get("cancelled") === "1";

  useEffect(() => {
    if (!authUser || !sessionId || !success) return;
    setBusy(true);
    syncStripeSession(sessionId)
      .then((response) => {
        setOrder(response.data);
        setDone(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Sync failed"))
      .finally(() => setBusy(false));
  }, [authUser, sessionId, success]);

  async function payDemo() {
    if (!paymentId || !token) return;
    setBusy(true);
    setError("");
    try {
      const response = await completeStripeDemo(paymentId, token);
      setOrder(response.data);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Zahlung fehlgeschlagen.", en: "Payment failed." }));
    } finally {
      setBusy(false);
    }
  }

  if (!authUser) {
    return (
      <Frame>
        <PageIntro kicker="Stripe" title={t({ de: "Anmelden erforderlich", en: "Login required" })} />
        <Link href="/login" className="mt-6 inline-block text-copper">{t({ de: "Login", en: "Log in" })}</Link>
      </Frame>
    );
  }

  if (cancelled) {
    return (
      <Frame>
        <PageIntro kicker="Stripe" title={t({ de: "Zahlung abgebrochen", en: "Payment cancelled" })} />
        <Link href="/account/orders" className="mt-6 inline-block text-copper">{t({ de: "Zu den Bestellungen", en: "Back to orders" })}</Link>
      </Frame>
    );
  }

  if (done && order) {
    return (
      <Frame>
        <PageIntro
          kicker="Stripe"
          title={t({ de: "Zahlung erfolgreich", en: "Payment successful" })}
          lede={t({ de: "Rechnung wurde erstellt.", en: "Invoice has been created." })}
        />
        <p className="mt-6 font-mono text-sm">{order.number}</p>
        <p className="mt-2 text-sm">{formatMoney(order.total, locale)}</p>
        <p className="mt-1 text-sm text-moss">{order.status}</p>
        <Link href="/account/orders" className="mt-6 inline-block text-copper">{t({ de: "Bestellung ansehen", en: "View order" })}</Link>
      </Frame>
    );
  }

  return (
    <Frame>
      <PageIntro
        kicker="Stripe Demo"
        title={t({ de: "Stripe Testzahlung", en: "Stripe test payment" })}
        lede={
          demo
            ? t({
                de: "Kein Stripe-Key hinterlegt — lokaler Demo-Checkout. Klicke Pay um die Zahlung als erfolgreich zu markieren.",
                en: "No Stripe key configured — local demo checkout. Click Pay to mark the payment successful.",
              })
            : t({ de: "Zahlung wird bestätigt…", en: "Confirming payment…" })
        }
      />
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {demo ? (
        <div className="mt-8 max-w-md rounded-3xl border border-line bg-white p-6">
          <Notice>
            {t({
              de: "Testkarte später: 4242 4242 4242 4242 — jetzt Demo ohne Stripe-Dashboard.",
              en: "Later use test card 4242 4242 4242 4242 — for now demo without Stripe Dashboard.",
            })}
          </Notice>
          <Button className="mt-6 w-full" variant="accent" disabled={busy} onClick={() => void payDemo()}>
            {busy ? "…" : t({ de: "Demo-Zahlung ausführen", en: "Complete demo payment" })}
          </Button>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{busy ? t({ de: "Bitte warten…", en: "Please wait…" }) : null}</p>
      )}
    </Frame>
  );
}

export default function StripeCheckoutPage() {
  return (
    <Suspense fallback={<Frame><p className="text-sm text-muted">Loading…</p></Frame>}>
      <StripeCheckoutInner />
    </Suspense>
  );
}
