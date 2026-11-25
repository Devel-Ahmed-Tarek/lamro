"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Frame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

function ResetPasswordInner() {
  const { t } = useStore();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState(search.get("email") ?? "");
  const [token] = useState(search.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      setError(t({ en: "Reset token is missing." }));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword({ email, token, password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ en: "Reset failed." }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Frame>
      <div className="mx-auto max-w-md">
        <PageIntro kicker={t({ en: "Account" })} title={t({ en: "Set a new password" })} />
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
          <Field label={t({ en: "New password" })}>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "…" : t({ en: "Update password" })}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-copper">{t({ en: "Back to login" })}</Link>
        </p>
      </div>
    </Frame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Frame><p className="text-sm text-muted">…</p></Frame>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
