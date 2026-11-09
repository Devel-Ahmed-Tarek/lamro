"use client";

import { Frame } from "@/components/shell";
import { Notice, PageIntro } from "@/components/ui";
import { useStore } from "@/lib/store";

export function ComingSoon({
  kicker,
  title,
  lede,
}: {
  kicker?: string;
  title?: string;
  lede?: string;
}) {
  const { t } = useStore();
  return (
    <Frame>
      <PageIntro
        kicker={kicker ?? t({ de: "Partner", en: "Partner" })}
        title={title ?? t({ de: "Coming soon", en: "Coming soon" })}
        lede={
          lede ??
          t({
            de: "Externe Firmen können später eigene Lose einstellen. Aktuell verkauft und versteigert nur Jala.",
            en: "External companies will be able to list lots later. Right now only Jala sells and auctions.",
          })
        }
      />
      <div className="mt-8">
        <Notice>
          {t({
            de: "Dieses Modul ist vorbereitet und erscheint in einer späteren Phase.",
            en: "This module is reserved and ships in a later phase.",
          })}
        </Notice>
      </div>
    </Frame>
  );
}
