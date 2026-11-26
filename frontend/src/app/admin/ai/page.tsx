"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Field, Notice, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { adminGet, adminPost, adminPut } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

type ProviderId = "demo" | "groq" | "gemini" | "openai";
type ProviderBlock = {
  key_set: boolean;
  key_hint: string | null;
  model: string;
  docs_url: string;
  default_model: string;
};

type AiAdminSettings = {
  provider: ProviderId;
  active_provider: ProviderId;
  groq: ProviderBlock;
  gemini: ProviderBlock;
  openai: ProviderBlock;
  setup: {
    steps: Array<{ title: string; detail: string }>;
  };
};

type TestResult = { ok: boolean; message: string; provider?: string; model?: string };

const emptyProvider = (): ProviderBlock => ({
  key_set: false,
  key_hint: null,
  model: "",
  docs_url: "#",
  default_model: "",
});

const empty: AiAdminSettings = {
  provider: "demo",
  active_provider: "demo",
  groq: emptyProvider(),
  gemini: emptyProvider(),
  openai: emptyProvider(),
  setup: { steps: [] },
};

export default function AdminAiPage() {
  const { t, can } = useStore();
  const [settings, setSettings] = useState<AiAdminSettings>(empty);
  const [provider, setProvider] = useState<ProviderId>("demo");
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [groqModel, setGroqModel] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [test, setTest] = useState<TestResult | null>(null);

  async function load() {
    const response = await adminGet<AiAdminSettings>("/api/v1/admin/ai-settings");
    const data = (response as { data: AiAdminSettings }).data;
    setSettings(data);
    setProvider(data.provider);
    setGroqModel(data.groq.model);
    setGeminiModel(data.gemini.model);
    setOpenaiModel(data.openai.model);
  }

  useEffect(() => {
    if (can("admin.system")) void load().catch(() => setError(t({ en: "Failed to load AI settings." })));
  }, [can, t]);

  if (!can("admin.system")) {
    return (
      <AdminShell>
        <p className="text-sm text-muted">{t({ de: "Kein Zugriff.", en: "No access" })}</p>
      </AdminShell>
    );
  }

  function savedPlaceholder(hint: string | null) {
    return `${t({ en: "Saved:" })} ${hint ?? "…"}. ${t({ en: "Leave blank to keep." })}`;
  }

  function translateApiMessage(message: string) {
    const known = [
      "Groq connection OK.",
      "Gemini connection OK.",
      "OpenAI connection OK.",
      "Select Groq, Gemini, or OpenAI and save an API key first.",
    ];
    if (known.includes(message)) return t({ en: message });
    if (message.startsWith("API key is missing for ")) {
      return `${t({ en: "API key is missing for" })} ${message.replace("API key is missing for ", "").replace(/\.$/, "")}.`;
    }
    return message;
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const payload: Record<string, unknown> = {
        provider,
        groq_model: groqModel.trim() || null,
        gemini_model: geminiModel.trim() || null,
        openai_model: openaiModel.trim() || null,
      };
      if (groqKey.trim()) payload.groq_key = groqKey.trim();
      if (geminiKey.trim()) payload.gemini_key = geminiKey.trim();
      if (openaiKey.trim()) payload.openai_key = openaiKey.trim();

      const response = await adminPut("/api/v1/admin/ai-settings", payload);
      const data = (response as { data: AiAdminSettings }).data;
      setSettings(data);
      setProvider(data.provider);
      setGroqModel(data.groq.model);
      setGeminiModel(data.gemini.model);
      setOpenaiModel(data.openai.model);
      setGroqKey("");
      setGeminiKey("");
      setOpenaiKey("");
      setNote(t({ en: "AI settings saved." }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Save failed." }));
    } finally {
      setBusy(false);
    }
  }

  async function onTest(target?: "groq" | "gemini" | "openai") {
    setBusy(true);
    setError("");
    setTest(null);
    try {
      const response = await adminPost("/api/v1/admin/ai-settings/test", target ? { provider: target } : {});
      setTest((response as { data: TestResult }).data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Connection test failed." }));
    } finally {
      setBusy(false);
    }
  }

  const providers: Array<{ id: ProviderId; title: string; hint: string }> = [
    { id: "demo", title: "Demo (no API key)", hint: "Local fallback for drafts/translations. No live AI calls." },
    { id: "groq", title: "Groq", hint: "Fast and affordable. Good default for catalog AI." },
    { id: "gemini", title: "Gemini (Google)", hint: "Google AI Studio key. Strong multilingual translation." },
    { id: "openai", title: "OpenAI", hint: "Official OpenAI API (ChatGPT models)." },
  ];

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t({ en: "AI agent" })}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {t({
          en: "Configure which AI provider powers product drafts and translations. Add API keys here — no server .env edit needed.",
        })}
      </p>

      <section className="mt-8 rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">{t({ en: "Setup checklist" })}</h2>
        <ol className="mt-4 space-y-4">
          {(settings.setup.steps.length
            ? settings.setup.steps
            : [
                { title: "Choose a provider", detail: "Pick Groq (fast/cheap), Gemini (Google), or OpenAI. Demo works without keys for local testing only." },
                { title: "Create an API key", detail: "Open the provider link, create a secret key, then paste it here. Leave blank to keep a saved key." },
                { title: "Set the model (optional)", detail: "Defaults work out of the box. Change only if your account uses a different model id." },
                { title: "Save and test", detail: "Save settings, then Test connection. Product draft/translate will use the active provider." },
              ]
          ).map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-xs">{index + 1}</span>
              <div>
                <p className="font-medium">{t({ en: step.title })}</p>
                <p className="mt-1 text-muted">{t({ en: step.detail })}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          {t({ en: "Active now:" })}{" "}
          <span className="font-medium text-ink">{settings.active_provider}</span>
          {settings.active_provider === "demo" && settings.provider !== "demo" ? (
            <span className="text-danger"> — {t({ en: "selected provider has no key, falling back to demo." })}</span>
          ) : null}
        </p>
      </section>

      <form onSubmit={onSave} className="mt-6 grid gap-6">
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">{t({ en: "Active provider" })}</h2>
          <p className="mt-1 text-sm text-muted">{t({ en: "Only one provider runs at a time. Keep keys for others saved so you can switch later." })}</p>
          <div className="mt-4 grid gap-2">
            {providers.map((item) => (
              <label key={item.id} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                <input
                  type="radio"
                  className="mt-1"
                  name="ai-provider"
                  checked={provider === item.id}
                  onChange={() => setProvider(item.id)}
                />
                <span>
                  <span className="font-medium">{t({ en: item.title })}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t({ en: item.hint })}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {(
          [
            { id: "groq" as const, title: "Groq", block: settings.groq, key: groqKey, setKey: setGroqKey, model: groqModel, setModel: setGroqModel },
            { id: "gemini" as const, title: "Gemini (Google)", block: settings.gemini, key: geminiKey, setKey: setGeminiKey, model: geminiModel, setModel: setGeminiModel },
            { id: "openai" as const, title: "OpenAI", block: settings.openai, key: openaiKey, setKey: setOpenaiKey, model: openaiModel, setModel: setOpenaiModel },
          ] as const
        ).map((row) => (
          <section key={row.id} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t({ en: row.title })}</h2>
              <a href={row.block.docs_url} target="_blank" rel="noreferrer" className="text-sm text-copper underline-offset-4 hover:underline">
                {t({ en: "Open API keys page" })} →
              </a>
            </div>
            <p className="mt-1 text-sm text-muted">
              {t({ en: "Paste the secret API key from the provider dashboard. Model id is optional." })}
            </p>
            <div className="mt-4 grid gap-4">
              <Field label={t({ en: "Secret API key" })}>
                <input
                  className={fieldClass}
                  type="password"
                  value={row.key}
                  onChange={(e) => row.setKey(e.target.value)}
                  placeholder={row.block.key_set ? savedPlaceholder(row.block.key_hint) : t({ en: "Paste secret key…" })}
                  autoComplete="new-password"
                />
              </Field>
              <Field label={t({ en: "Model id" })}>
                <input
                  className={fieldClass}
                  value={row.model}
                  onChange={(e) => row.setModel(e.target.value)}
                  placeholder={row.block.default_model}
                  autoComplete="off"
                />
              </Field>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onTest(row.id)}
              className="mt-4 rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
            >
              {t({ en: "Test this provider" })}
            </button>
          </section>
        ))}

        {test ? (
          <p className={`text-sm ${test.ok ? "text-moss" : "text-danger"}`}>
            {translateApiMessage(test.message)}
            {test.model ? ` · ${test.model}` : ""}
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {note ? <p className="text-sm text-moss">{note}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="rounded-full bg-copper px-6 py-2.5 text-sm font-medium text-paper disabled:opacity-60">
            {busy ? "…" : t({ en: "Save AI settings" })}
          </button>
          <button
            type="button"
            disabled={busy || provider === "demo"}
            onClick={() => void onTest()}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
          >
            {t({ en: "Test active provider" })}
          </button>
        </div>

        <Notice>
          {t({
            en: "Env keys remain a fallback if a field is empty. Dashboard values take priority once saved.",
          })}
        </Notice>
      </form>
    </AdminShell>
  );
}
