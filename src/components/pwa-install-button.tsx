"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Monitor, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const instructions = useMemo(() => {
    return [
      {
        title: "iPhone (Safari)",
        icon: Share2,
        steps: ["Trykk Del-ikonet nederst i Safari", "Velg Legg til på Hjem-skjerm"],
      },
      {
        title: "Android (Chrome)",
        icon: Smartphone,
        steps: ["Trykk menyen (tre prikker) i nettleseren", "Velg Installer app eller Legg til på startskjerm"],
      },
      {
        title: "Desktop (Chrome/Edge)",
        icon: Monitor,
        steps: ["Klikk installer-ikonet i adressefeltet", "Bekreft ved å velge Installer"],
      },
    ];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
    const isIosStandalone =
      typeof window.navigator !== "undefined" &&
      "standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    const updateStandaloneState = () => {
      setIsStandalone(standaloneMediaQuery.matches || isIosStandalone);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsDialogOpen(false);
    };

    updateStandaloneState();
    standaloneMediaQuery.addEventListener("change", updateStandaloneState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      standaloneMediaQuery.removeEventListener("change", updateStandaloneState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setIsDialogOpen(true);
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleInstall} disabled={isInstalling}>
        <Download className="mr-2 h-5 w-5" aria-hidden="true" />
        {deferredPrompt ? "Installer app" : "Hvordan installere appen"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Installer HMS Nova</DialogTitle>
            <DialogDescription>
              HMS Nova kan installeres på både mobil og desktop for raskere tilgang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {instructions.map((item) => (
              <div key={item.title} className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>{item.title}</span>
                </div>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {item.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
