"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Frame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function RegisterPage() {
  const { t, registerAuth } = useStore();
  const router = useRouter();
  const [kind, setKind] = useState<"private" | "business">("private");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [vat, setVat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerAuth({
        name,
        email,
        password,
        account_type: kind,
        company_name: kind === "business" ? company : undefined,
        vat_id: kind === "business" ? vat || undefined : undefined,
        country: "DE",
      });
      router.push("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Registrierung fehlgeschlagen.", en: "Registration failed." }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Frame>
      <div className="mx-auto max-w-lg">
        <PageIntro kicker={t({ de: "Registrierung", en: "Register" })} title={t({ de: "Konto anlegen.", en: "Create an account." })} />
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div className="flex flex-wrap gap-2">
            {(["private", "business"] as const).map((option) => (
              <button type="button" key={option} onClick={() => setKind(option)} className={`rounded-full px-3 py-1.5 text-sm ${kind === option ? "bg-ink text-paper" : "border border-line"}`}>
                {option === "private" ? t({ de: "Privat", en: "Private" }) : t({ de: "Firma als Käufer", en: "Business buyer" })}
              </button>
            ))}
          </div>
          <Field label={t({ de: "Name", en: "Name" })}><input required className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t({ de: "E-Mail", en: "Email" })}><input required type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {kind === "business" ? <Field label={t({ de: "Firma", en: "Company" })}><input required className={fieldClass} value={company} onChange={(e) => setCompany(e.target.value)} /></Field> : null}
          {kind === "business" ? <Field label="VAT ID"><input className={fieldClass} value={vat} onChange={(e) => setVat(e.target.value)} /></Field> : null}
          <Field label={t({ de: "Passwort", en: "Password" })}><input required type="password" minLength={6} className={fieldClass} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error ? <p className="text-sm text-copper">{error}</p> : null}
          <Button type="submit" variant="accent" disabled={loading}>{loading ? "…" : t({ de: "Konto erstellen", en: "Create account" })}</Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          {t({ de: "Bereits registriert?", en: "Already registered?" })}{" "}
          <Link href="/login" className="text-copper">{t({ de: "Anmelden", en: "Log in" })}</Link>
        </p>
      </div>
    </Frame>
  );
}
