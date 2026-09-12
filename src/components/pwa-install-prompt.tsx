"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  dismissPwaInstallPrompt,
  hasDismissedPwaInstall,
  isStandaloneDisplay,
  setDeferredPwaPrompt,
  type BeforeInstallPromptEvent,
  runPwaInstallFromUserGesture,
} from "@/lib/pwa-install";

const FIRST_VISIT_DELAY_MS = 1800;

export function PwaInstallPrompt() {
  const { status } = useSession();

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

    const timeoutId = window.setTimeout(() => {
      if (status !== "authenticated") return;
      if (isStandaloneDisplay() || hasDismissedPwaInstall()) return;

      toast("Legg HMS Nova på skrivebordet", {
        id: "pwa-install-first-visit",
        description: "Installer appen for raskere tilgang, slik du tillater varslinger.",
        duration: 14000,
        action: {
          label: "Installer",
          onClick: () => {
            void runPwaInstallFromUserGesture();
          },
        },
        cancel: {
          label: "Ikke nå",
          onClick: () => {
            dismissPwaInstallPrompt();
          },
        },
      });
    }, FIRST_VISIT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [status]);

  return null;
}
