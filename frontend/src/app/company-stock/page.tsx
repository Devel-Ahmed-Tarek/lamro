"use client";

import { FormEvent, useState } from "react";
import { Frame } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, Notice, PageIntro, fieldClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { submitCompanyStockListing } from "@/lib/company-stock-api";
import { useStore } from "@/lib/store";

export default function CompanyStockPage() {
  const { t } = useStore();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const files = (formEl.elements.namedItem("photos") as HTMLInputElement | null)?.files;
    form.delete("photos");
    if (files) {
      Array.from(files).slice(0, 8).forEach((file) => form.append("photos[]", file));
    }

    setBusy(true);
    setError("");
    try {
      await submitCompanyStockListing(form);
      setSent(true);
      formEl.reset();
      setPreviews([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t({ de: "Senden fehlgeschlagen.", en: "Submit failed." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <PageIntro
        kicker={t({ de: "Firmenlager", en: "Company stock" })}
        title={t({
          de: "Unternehmen mit Lagerbestand anbieten oder finden.",
          en: "Offer or find companies with inventory.",
        })}
        lede={t({
          de: "Firmenbesitzer können hier Lagerbestände jeder Art melden. Jala prüft die Anfrage und stellt den Kontakt her.",
          en: "Company owners can list inventory of any kind here. Jala reviews the request and connects the parties.",
        })}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        {sent ? (
          <Notice>
            {t({
              de: "Danke. Ihre Meldung ist im Super-Admin-Dashboard eingegangen. Wir melden uns zeitnah.",
              en: "Thanks. Your listing is in the Super Admin dashboard. We will contact you soon.",
            })}
          </Notice>
        ) : (
          <form className="space-y-4 rounded-3xl border border-line bg-white p-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t({ de: "Firmenname", en: "Company name" })}>
                <input name="company_name" required className={fieldClass} />
              </Field>
              <Field label={t({ de: "Ansprechpartner", en: "Contact person" })}>
                <input name="contact_name" required className={fieldClass} />
              </Field>
              <Field label={t({ de: "E-Mail", en: "Email" })}>
                <input name="email" type="email" required className={fieldClass} />
              </Field>
              <Field label={t({ de: "Mobilnummer", en: "Mobile number" })}>
                <input name="phone" type="tel" required className={fieldClass} placeholder="+49…" />
              </Field>
              <Field label={t({ de: "Stadt", en: "City" })}>
                <input name="city" className={fieldClass} />
              </Field>
              <Field label={t({ de: "Land", en: "Country" })}>
                <input name="country" className={fieldClass} defaultValue="DE" />
              </Field>
            </div>

            <Field label={t({ de: "Art des Bestands", en: "Inventory type" })}>
              <input
                name="inventory_type"
                className={fieldClass}
                placeholder={t({
                  de: "z.B. Antriebe, SPS, Schaltschränke, gemischt…",
                  en: "e.g. drives, PLC, cabinets, mixed…",
                })}
              />
            </Field>

            <Field label={t({ de: "Beschreibung", en: "Description" })}>
              <textarea
                name="description"
                required
                rows={6}
                className={fieldClass}
                placeholder={t({
                  de: "Was soll verkauft / vermittelt werden? Menge, Zustand, Standort…",
                  en: "What should be sold / brokered? Quantity, condition, location…",
                })}
              />
            </Field>

            <Field label={t({ de: "Fotos (max. 8)", en: "Photos (max 8)" })}>
              <input
                name="photos"
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).slice(0, 8);
                  setPreviews(files.map((file) => URL.createObjectURL(file)));
                }}
              />
            </Field>

            {previews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previews.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="h-28 w-full rounded-2xl object-cover border border-line" />
                ))}
              </div>
            ) : null}

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {t({ de: "Anfrage senden", en: "Submit listing" })}
            </Button>
          </form>
        )}

        <aside className="space-y-4 text-sm text-muted">
          <div className="rounded-3xl border border-line bg-paper p-5">
            <p className="font-medium text-ink">{t({ de: "Für wen ist das?", en: "Who is this for?" })}</p>
            <p className="mt-2">
              {t({
                de: "Unternehmen mit überschüssigem oder Restlager, die Käufer suchen — und Firmen, die gezielt Lagerbestände übernehmen wollen.",
                en: "Companies with surplus or leftover stock looking for buyers — and firms that want to acquire inventory.",
              })}
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper p-5">
            <p className="font-medium text-ink">{t({ de: "Ablauf", en: "Process" })}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>{t({ de: "Formular ausfüllen + Fotos", en: "Fill the form + photos" })}</li>
              <li>{t({ de: "Jala prüft im Admin", en: "Jala reviews in admin" })}</li>
              <li>{t({ de: "Kontaktaufnahme per Telefon/E-Mail", en: "Contact by phone/email" })}</li>
            </ol>
          </div>
        </aside>
      </div>
    </Frame>
  );
}
