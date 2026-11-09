"use client";

import { useEffect, useState } from "react";
import { fetchAuction, type ApiAuction } from "@/lib/auction-api";
import { getEcho, reverbEnabled } from "@/lib/echo";

export function useAuctionRealtime(slug: string, initial: ApiAuction | null) {
  const [auction, setAuction] = useState<ApiAuction | null>(initial);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setAuction(initial);
  }, [initial]);

  useEffect(() => {
    if (!auction?.id || auction.status !== "live") return;

    const echo = getEcho();
    if (echo) {
      const channel = echo.channel(`auction.${auction.id}`);
      setConnected(true);

      channel.listen(".bid.placed", (payload: { auction?: ApiAuction }) => {
        if (payload.auction) setAuction(payload.auction);
      });
      channel.listen(".auction.extended", (payload: { ends_at?: string; ends_in_seconds?: number; version?: number }) => {
        setAuction((current) =>
          current
            ? {
                ...current,
                ends_at: payload.ends_at ?? current.ends_at,
                ends_in_seconds: payload.ends_in_seconds ?? current.ends_in_seconds,
                version: payload.version ?? current.version,
              }
            : current,
        );
      });
      channel.listen(".auction.ended", (payload: { auction?: ApiAuction }) => {
        if (payload.auction) setAuction(payload.auction);
      });

      return () => {
        echo.leave(`auction.${auction.id}`);
        setConnected(false);
      };
    }

    const id = window.setInterval(() => {
      void fetchAuction(slug)
        .then((response) => setAuction(response.data))
        .catch(() => undefined);
    }, reverbEnabled() ? 15000 : 5000);

    return () => window.clearInterval(id);
  }, [auction?.id, auction?.status, slug]);

  useEffect(() => {
    if (!auction?.ends_at || auction.status !== "live") return;
    const tick = window.setInterval(() => {
      setAuction((current) => {
        if (!current?.ends_at) return current;
        const ends = new Date(current.ends_at).getTime();
        const seconds = Math.max(0, Math.floor((ends - Date.now()) / 1000));
        if (seconds === current.ends_in_seconds) return current;
        return { ...current, ends_in_seconds: seconds };
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [auction?.ends_at, auction?.status]);

  return { auction, setAuction, connected, realtime: reverbEnabled() };
}
