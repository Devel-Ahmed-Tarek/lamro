"use client";

import { FormEvent, useState } from "react";
import { Frame } from "@/components/shell";
import { Field, Notice, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { sendContact } from "@/lib/platform-api";
import { useStore } from "@/lib/store";

export default function ContactPage() {
  const { t } = useStore();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await sendContact({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        subject: String(form.get("subject") || ""),
        message: String(form.get("message") || ""),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Senden fehlgeschlagen.", en: "Send failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <PageIntro kicker={t({ de: "Kontakt", en: "Contact" })} title={t({ de: "Schreiben Sie uns.", en: "Write to us." })} lede={t({ de: "Für eine Frage zu einem bestimmten Artikel nutzen Sie bitte „Frage stellen“ auf der Produktseite.", en: "For a question about a specific item, use Ask a question on the product page." })} />
      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_280px]">
        {sent ? <Notice>{t({ de: "Nachricht ist im Admin-Posteingang.", en: "Message is in the admin inbox." })}</Notice> : (
          <form className="grid gap-4" onSubmit={onSubmit}>
            <Field label={t({ de: "Name", en: "Name" })}><input name="name" required className={fieldClass} /></Field>
            <Field label={t({ de: "E-Mail", en: "Email" })}><input name="email" required type="email" className={fieldClass} /></Field>
            <Field label={t({ de: "Betreff", en: "Subject" })}><input name="subject" required className={fieldClass} /></Field>
            <Field label={t({ de: "Nachricht", en: "Message" })}><textarea name="message" required rows={5} className={fieldClass} /></Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button disabled={busy} className="w-fit rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-60">{t({ de: "Nachricht senden", en: "Send message" })}</button>
          </form>
        )}
        <aside className="text-sm text-muted">
          <p className="font-medium text-ink">Jala GmbH</p>
          <p className="mt-2">{t({ de: "Musterstraße 12", en: "Sample Street 12" })}</p>
          <p>50667 Köln</p>
          <p className="mt-4">+49 221 000000</p>
          <p>hello@jala.example</p>
        </aside>
      </div>
    </Frame>
  );
}
