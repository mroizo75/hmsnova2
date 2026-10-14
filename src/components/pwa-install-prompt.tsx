"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  dismissPwaInstallPrompt,
  isStandaloneDisplay,
  setDeferredPwaPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

export function PwaInstallPrompt() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay()) return;

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPwaPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPwaPrompt(null);
      dismissPwaInstallPrompt();
      toast.success("HMS Nova er lagt til på skrivebordet.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
