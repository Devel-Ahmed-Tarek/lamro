"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Frame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { isAdminUser, isCustomerUser } from "@/lib/auth-api";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { t, loginAuth } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("customer@jala.de");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await loginAuth(email, password);
      if (isAdminUser(user)) router.push("/admin");
      else if (isCustomerUser(user)) router.push("/account");
      else router.push("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.errors?.email?.[0] ?? err.message
          : t({ de: "Anmeldung fehlgeschlagen.", en: "Login failed." });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Frame>
      <div className="mx-auto max-w-md">
        <PageIntro kicker={t({ de: "Konto", en: "Account" })} title={t({ de: "Anmelden", en: "Log in" })} />
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <Field label={t({ de: "E-Mail", en: "Email" })}>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} autoComplete="username" />
          </Field>
          <Field label={t({ de: "Passwort", en: "Password" })}>
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="current-password" />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "…" : t({ de: "Anmelden", en: "Log in" })}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          {t({ de: "Noch kein Konto?", en: "No account yet?" })}{" "}
          <Link href="/register" className="text-copper">{t({ de: "Registrieren", en: "Register" })}</Link>
        </p>
        <p className="mt-2 text-xs text-muted">Admin: admin@jala.de / admin · Customer: customer@jala.de / password</p>
      </div>
    </Frame>
  );
}
