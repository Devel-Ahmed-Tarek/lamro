"use client";

import Link from "next/link";
import { useState } from "react";
import { Frame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, Notice, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { forgotPassword } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function ForgotPasswordPage() {
  const { t } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Request failed." }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Frame>
      <div className="mx-auto max-w-md">
        <PageIntro
          kicker={t({ en: "Account" })}
          title={t({ en: "Forgot password" })}
          lede={t({ en: "Enter your email and we will send a reset link if an account exists." })}
        />
        {done ? (
          <div className="mt-8">
            <Notice>
              {t({ en: "If an account exists for that email, a reset link has been sent." })}
            </Notice>
            <Link href="/login" className="mt-4 inline-block text-sm text-copper">
              {t({ en: "Back to login" })}
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <Field label={t({ en: "Email" })}>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                autoComplete="email"
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" variant="accent" className="w-full" disabled={loading}>
              {loading ? "…" : t({ en: "Send reset link" })}
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-copper">{t({ en: "Back to login" })}</Link>
        </p>
      </div>
    </Frame>
  );
}
