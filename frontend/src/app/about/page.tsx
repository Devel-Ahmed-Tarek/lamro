"use client";

import { Frame } from "@/components/shell";
import { PageIntro } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function AboutPage() {
  const { t } = useStore();
  return (
    <Frame>
      <PageIntro
        kicker={t({ de: "Über uns", en: "About" })}
        title={t({ de: "Ein Handelshaus für Industrieelektronik.", en: "A trading house for industrial electronics." })}
        lede={t({ de: "Jala beschafft, prüft und verkauft Komponenten für den Weiterbetrieb von Maschinen — im eigenen Shop und über Auktionen.", en: "Jala sources, tests, and sells components that keep machines running — in our store and through auctions." })}
      />
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <p className="text-lg leading-8">{t({ de: "Wir arbeiten mit Betrieben, Instandhaltern und Händlern. Jeder Artikel trägt Hersteller, Teilenummer und einen ehrlichen Prüfstatus. Was nicht getestet wurde, steht auch so da.", en: "We work with plants, maintenance teams, and dealers. Every listing carries the manufacturer, part number, and an honest testing status. What was not tested is labeled as such." })}</p>
        <ul className="space-y-4 text-sm">
          {[
            [t({ de: "Eigenes Lager", en: "Own stock" }), t({ de: "Shop und Jala-Auktionen greifen auf denselben Bestand zu.", en: "The store and Jala auctions draw on the same inventory." })],
            [t({ de: "Geprüfte Partner", en: "Vetted partners" }), t({ de: "Externe Firmen verkaufen nach Freigabe nur im Auktionsbereich.", en: "External companies sell only in auctions after approval." })],
            [t({ de: "Deutschland & EU", en: "Germany & the EU" }), t({ de: "Rechnungen und Steuerlogik sind auf den deutschen Handel ausgelegt.", en: "Invoices and tax handling are set up for German trade." })],
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
