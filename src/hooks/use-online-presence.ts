"use client";

import { useEffect, useState } from "react";
import type { OnlinePresenceSnapshot } from "@/lib/presence";

const POLL_MS = 20_000;

export function useOnlinePresence(enabled = true) {
  const [data, setData] = useState<OnlinePresenceSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/presence", { credentials: "include" });
        if (!response.ok) return;
        const snapshot = (await response.json()) as OnlinePresenceSnapshot;
        if (!cancelled) setData(snapshot);
      } catch {
        // Behold forrige snapshot ved nettverksfeil
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);

  return data;
}
