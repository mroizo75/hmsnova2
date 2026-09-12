"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDeferredPwaPrompt,
  isIosSafari,
  isStandaloneDisplay,
  runPwaInstallFromUserGesture,
  subscribePwaInstall,
} from "@/lib/pwa-install";

export function PwaInstallButton() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandaloneState = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    updateStandaloneState();
    setCanPrompt(getDeferredPwaPrompt() !== null);
    standaloneMediaQuery.addEventListener("change", updateStandaloneState);
    const unsubscribe = subscribePwaInstall(() => {
      setCanPrompt(getDeferredPwaPrompt() !== null);
      updateStandaloneState();
    });

    return () => {
      standaloneMediaQuery.removeEventListener("change", updateStandaloneState);
      unsubscribe();
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await runPwaInstallFromUserGesture();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full justify-start text-xs"
      onClick={() => void handleInstall()}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
      )}
      {canPrompt || !isIosSafari() ? "Installer app" : "Legg til på Hjem-skjerm"}
    </Button>
  );
}
