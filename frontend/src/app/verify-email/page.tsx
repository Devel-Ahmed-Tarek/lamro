"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Frame } from "@/components/shell";
import { Notice, PageIntro } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { verifyEmail } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

function VerifyEmailInner() {
  const { t, refreshMe, authUser } = useStore();
  const search = useSearchParams();
  const email = search.get("email") ?? "";
  const token = search.get("token") ?? "";
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setStatus("error");
      setError(t({ en: "Verification link is incomplete." }));
      return;
    }
    verifyEmail(email, token)
      .then(async () => {
        setStatus("ok");
        if (authUser) await refreshMe().catch(() => undefined);
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : t({ en: "Verification failed." }));
      });
  }, [email, token, t, authUser, refreshMe]);

  return (
    <Frame>
      <div className="mx-auto max-w-md">
        <PageIntro kicker={t({ en: "Account" })} title={t({ en: "Email verification" })} />
        <div className="mt-8">
          {status === "pending" ? <p className="text-sm text-muted">{t({ en: "Confirming your email…" })}</p> : null}
          {status === "ok" ? (
            <Notice>{t({ en: "Your email has been verified." })}</Notice>
          ) : null}
          {status === "error" ? <p className="text-sm text-danger">{error}</p> : null}
          <Link href={authUser ? "/account" : "/login"} className="mt-4 inline-block text-sm text-copper">
            {authUser ? t({ en: "Go to account" }) : t({ en: "Back to login" })}
          </Link>
        </div>
      </div>
    </Frame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Frame><p className="text-sm text-muted">…</p></Frame>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
