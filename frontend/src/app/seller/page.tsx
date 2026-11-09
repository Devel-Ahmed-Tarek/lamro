"use client";

import { ComingSoon } from "@/components/coming-soon";
import { useStore } from "@/lib/store";

export default function SellerHome() {
  const { t } = useStore();
  return (
    <ComingSoon
      kicker={t({ de: "Partner", en: "Partner" })}
      title={t({ de: "Partner-Bereich — Coming soon", en: "Partner area — Coming soon" })}
    />
  );
}
