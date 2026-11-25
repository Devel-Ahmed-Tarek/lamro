"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Field, Notice, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { adminGet, adminPost, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type MethodOption = { id: string; label: string; hint: string };
type SetupStep = { title: string; detail: string; url?: string };

type StripeAdminSettings = {
  enabled: boolean;
  demo_mode: boolean;
  publishable_key: string | null;
  secret_key_set: boolean;
  secret_key_hint: string | null;
  webhook_secret_set: boolean;
  webhook_secret_hint: string | null;
  webhook_url: string;
  payment_method_types: string[];
  available_payment_method_types: MethodOption[];
  statement_descriptor: string | null;
  capture_method: "automatic" | "manual";
  billing_address_collection: "auto" | "required";
  phone_number_collection: boolean;
  allow_promotion_codes: boolean;
  tax_id_collection: boolean;
  bank_transfer_enabled: boolean;
  paypal_feature_enabled: boolean;
  setup: {
    dashboard_keys_url: string;
    dashboard_webhooks_url: string;
    dashboard_payment_methods_url: string;
    events: string[];
    steps: SetupStep[];
  };
};

type TestResult = {
  ok: boolean;
  message: string;
  account_id?: string | null;
  livemode?: boolean;
  country?: string | null;
  business_name?: string | null;
};

const empty: StripeAdminSettings = {
  enabled: false,
  demo_mode: true,
  publishable_key: null,
  secret_key_set: false,
  secret_key_hint: null,
  webhook_secret_set: false,
  webhook_secret_hint: null,
  webhook_url: "",
  payment_method_types: ["card"],
  available_payment_method_types: [],
  statement_descriptor: null,
  capture_method: "automatic",
  billing_address_collection: "auto",
  phone_number_collection: false,
  allow_promotion_codes: false,
  tax_id_collection: false,
  bank_transfer_enabled: true,
  paypal_feature_enabled: false,
  setup: {
    dashboard_keys_url: "https://dashboard.stripe.com/apikeys",
    dashboard_webhooks_url: "https://dashboard.stripe.com/webhooks",
    dashboard_payment_methods_url: "https://dashboard.stripe.com/settings/payment_methods",
    events: ["checkout.session.completed"],
    steps: [],
  },
};

export default function AdminStripePage() {
  const { t, can } = useStore();
  const [settings, setSettings] = useState<StripeAdminSettings>(empty);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [test, setTest] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const response = await adminGet<StripeAdminSettings>("/api/v1/admin/stripe-settings");
    const data = (response as { data: StripeAdminSettings }).data;
    setSettings(data);
    setPublishableKey(data.publishable_key || "");
  }

  useEffect(() => {
    if (can("admin.payments")) void load().catch(() => setError(t({ en: "Failed to load Stripe settings." })));
  }, [can, t]);

  if (!can("admin.payments")) {
    return (
      <AdminShell>
        <p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p>
      </AdminShell>
    );
  }

  function toggleMethod(id: string) {
    setSettings((prev) => {
      const has = prev.payment_method_types.includes(id);
      const next = has
        ? prev.payment_method_types.filter((m) => m !== id)
        : [...prev.payment_method_types, id];
      return { ...prev, payment_method_types: next.length ? next : ["card"] };
    });
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const payload: Record<string, unknown> = {
        enabled: settings.enabled,
        demo_mode: settings.demo_mode,
        publishable_key: publishableKey.trim() || null,
        payment_method_types: settings.payment_method_types,
        statement_descriptor: settings.statement_descriptor || null,
        capture_method: settings.capture_method,
        billing_address_collection: settings.billing_address_collection,
        phone_number_collection: settings.phone_number_collection,
        allow_promotion_codes: settings.allow_promotion_codes,
        tax_id_collection: settings.tax_id_collection,
        bank_transfer_enabled: settings.bank_transfer_enabled,
        paypal_feature_enabled: settings.paypal_feature_enabled,
      };
      if (secretKey.trim()) payload.secret_key = secretKey.trim();
      if (webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();

      const response = await adminPut("/api/v1/admin/stripe-settings", payload);
      const data = (response as { data: StripeAdminSettings }).data;
      setSettings(data);
      setPublishableKey(data.publishable_key || "");
      setSecretKey("");
      setWebhookSecret("");
      setNote(t({ en: "Stripe settings saved." }));
      window.dispatchEvent(new Event("jala-features-changed"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError("");
    setTest(null);
    try {
      const response = await adminPost("/api/v1/admin/stripe-settings/test");
      setTest((response as { data: TestResult }).data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Connection test failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(settings.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t({ en: "Could not copy. Select the URL manually." }));
    }
  }

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ de: "Stripe", en: "Stripe" })}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t({
          en: "Full control for super admins: keys, webhook, checkout methods, and site payment channels.",
        })}
      </p>

      <section className="mt-8 rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">{t({ en: "Setup checklist" })}</h2>
        <ol className="mt-4 space-y-4">
          {settings.setup.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-xs">{index + 1}</span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-muted">{step.detail}</p>
                {step.url ? (
                  <a href={step.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-copper underline-offset-4 hover:underline">
                    {t({ en: "Open in Stripe" })}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <form onSubmit={onSave} className="mt-6 grid gap-6">
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "Site payment channels" })}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>Stripe</span>
              <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>{t({ de: "Banküberweisung", en: "Bank transfer" })}</span>
              <input type="checkbox" checked={settings.bank_transfer_enabled} onChange={(e) => setSettings({ ...settings, bank_transfer_enabled: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>PayPal {t({ en: "(feature flag)" })}</span>
              <input type="checkbox" checked={settings.paypal_feature_enabled} onChange={(e) => setSettings({ ...settings, paypal_feature_enabled: e.target.checked })} />
            </label>
          </div>
          <label className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
            <span>
              {t({ en: "Demo mode" })}
              <span className="mt-1 block text-xs text-muted">{t({ en: "ON = local demo pay page. OFF = real Stripe Checkout (needs secret key)." })}</span>
            </span>
            <input type="checkbox" checked={settings.demo_mode} onChange={(e) => setSettings({ ...settings, demo_mode: e.target.checked })} />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "API keys" })}</h2>
          <p className="mt-1 text-sm text-muted">
            {t({ en: "From Stripe Dashboard → Developers → API keys." })}{" "}
            <a href={settings.setup.dashboard_keys_url} target="_blank" rel="noreferrer" className="text-copper underline-offset-4 hover:underline">
              dashboard.stripe.com/apikeys
            </a>
          </p>
          <div className="mt-4 grid gap-4">
            <Field label={t({ en: "Publishable key (pk_test_… / pk_live_…)" })}>
              <input className={fieldClass} value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} placeholder="pk_…" autoComplete="off" />
            </Field>
            <Field label={t({ en: "Secret key (sk_test_… / sk_live_…)" })}>
              <input
                className={fieldClass}
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={settings.secret_key_set ? t({ en: `Saved: ${settings.secret_key_hint}. Leave blank to keep.` }) : "sk_…"}
                autoComplete="new-password"
              />
            </Field>
            <Field label={t({ en: "Webhook signing secret (whsec_…)" })}>
              <input
                className={fieldClass}
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={settings.webhook_secret_set ? t({ en: `Saved: ${settings.webhook_secret_hint}. Leave blank to keep.` }) : "whsec_…"}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void onTest()} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60">
              {t({ en: "Test connection" })}
            </button>
            {test ? (
              <p className={`text-sm ${test.ok ? "text-moss" : "text-danger"}`}>
                {test.message}
                {test.ok && test.account_id ? ` · ${test.account_id}${test.livemode ? " (live)" : " (test)"}` : ""}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "Webhook URL" })}</h2>
          <p className="mt-1 text-sm text-muted">
            {t({
              en: "Paste this exact URL in Stripe → Developers → Webhooks → Add endpoint. Event: checkout.session.completed. Then copy the Signing secret (whsec_…) into the field above.",
            })}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl bg-paper px-4 py-3 font-mono text-xs">{settings.webhook_url || "…"}</code>
            <button type="button" onClick={() => void copyWebhook()} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
              {copied ? t({ en: "Copied" }) : t({ en: "Copy URL" })}
            </button>
          </div>
          <a href={settings.setup.dashboard_webhooks_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-copper underline-offset-4 hover:underline">
            {t({ en: "Open Stripe Webhooks" })}
          </a>
          <Notice>
            {t({
              en: "Recommended event: checkout.session.completed. Production rejects unsigned webhooks.",
            })}
          </Notice>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "Stripe Checkout payment methods" })}</h2>
          <p className="mt-1 text-sm text-muted">
            {t({
              en: "Methods offered on Stripe Checkout. Also enable each one under Stripe → Settings → Payment methods.",
            })}{" "}
            <a href={settings.setup.dashboard_payment_methods_url} target="_blank" rel="noreferrer" className="text-copper underline-offset-4 hover:underline">
              {t({ en: "Open payment methods" })}
            </a>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {settings.available_payment_method_types.map((method) => (
              <label key={method.id} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.payment_method_types.includes(method.id)}
                  onChange={() => toggleMethod(method.id)}
                />
                <span>
                  <span className="font-medium">{method.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{method.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t({ en: "Apple Pay / Google Pay appear automatically when Card is on and wallets are enabled in Stripe." })}
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "Checkout options" })}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t({ en: "Statement descriptor (max 22)" })}>
              <input
                className={fieldClass}
                maxLength={22}
                value={settings.statement_descriptor || ""}
                onChange={(e) => setSettings({ ...settings, statement_descriptor: e.target.value })}
                placeholder="JALA"
              />
            </Field>
            <Field label={t({ en: "Capture method" })}>
              <select
                className={fieldClass}
                value={settings.capture_method}
                onChange={(e) => setSettings({ ...settings, capture_method: e.target.value as "automatic" | "manual" })}
              >
                <option value="automatic">{t({ en: "Automatic" })}</option>
                <option value="manual">{t({ en: "Manual (authorize then capture)" })}</option>
              </select>
            </Field>
            <Field label={t({ en: "Billing address collection" })}>
              <select
                className={fieldClass}
                value={settings.billing_address_collection}
                onChange={(e) => setSettings({ ...settings, billing_address_collection: e.target.value as "auto" | "required" })}
              >
                <option value="auto">{t({ en: "Auto" })}</option>
                <option value="required">{t({ en: "Required" })}</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>{t({ en: "Collect phone" })}</span>
              <input type="checkbox" checked={settings.phone_number_collection} onChange={(e) => setSettings({ ...settings, phone_number_collection: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>{t({ en: "Promotion codes" })}</span>
              <input type="checkbox" checked={settings.allow_promotion_codes} onChange={(e) => setSettings({ ...settings, allow_promotion_codes: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>{t({ en: "Tax ID collection" })}</span>
              <input type="checkbox" checked={settings.tax_id_collection} onChange={(e) => setSettings({ ...settings, tax_id_collection: e.target.checked })} />
            </label>
          </div>
        </section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {note ? <p className="text-sm text-moss">{note}</p> : null}

        <button type="submit" disabled={busy} className="w-fit rounded-full bg-copper px-6 py-2.5 text-sm font-medium text-paper disabled:opacity-60">
          {busy ? "…" : t({ en: "Save Stripe settings" })}
        </button>
      </form>
    </AdminShell>
  );
}
