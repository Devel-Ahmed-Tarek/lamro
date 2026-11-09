"use client";

import { Frame } from "@/components/shell";
import { PageIntro } from "@/components/ui";
import { useStore } from "@/lib/store";

const items = [
  { de: "Ankauf & Prüfung", en: "Purchase & testing", text: { de: "Rückläufer und Überbestände werden aufgenommen, fotografiert und mit Zustand sowie Prüfstatus versehen.", en: "Returns and surplus stock are received, photographed, and labeled with condition and testing status." } },
  { de: "Direktverkauf", en: "Direct sale", text: { de: "Fester Preis, Mengenrabatt und Angebotsanfrage im Shop.", en: "Fixed price, quantity discounts, and quote requests in the store." } },
  { de: "Auktionen", en: "Auctions", text: { de: "Zeit- und Live-Auktionen, automatisches Bieten und Sofortkauf, wenn freigeschaltet.", en: "Timed and live auctions, automatic bidding, and Buy Now when enabled." } },
  { de: "Ersatzteilsuche", en: "Part search", text: { de: "Suche über Teilenummer, Hersteller und Modell. Fragen bleiben am Artikel hängen.", en: "Search by part number, manufacturer, and model. Questions stay attached to the item." } },
];

export default function ServicesPage() {
  const { t } = useStore();
  return (
    <Frame>
      <PageIntro kicker={t({ de: "Leistungen", en: "Services" })} title={t({ de: "Was Jala übernimmt.", en: "What Jala handles." })} />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.en} className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-xl font-semibold">{t({ de: item.de, en: item.en })}</h2>
            <p className="mt-3 text-muted">{t(item.text)}</p>
          </article>
        ))}
      </div>
    </Frame>
  );
}
