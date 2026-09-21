"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const PING_INTERVAL_MS = 60_000;

async function pingPresence() {
  try {
    await fetch("/api/presence", { method: "POST", credentials: "include" });
  } catch {
    // Nettverksfeil skal ikke påvirke appen
  }
}

export function PresenceBeacon() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const sendIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      void pingPresence();
    };

    sendIfVisible();
    const interval = window.setInterval(sendIfVisible, PING_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void pingPresence();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", sendIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", sendIfVisible);
    };
  }, [status]);

  return null;
}
