"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Monitor, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hmsnova-tavle-banner-dismissed";

export function TavlePromoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
        <Monitor className="h-4.5 w-4.5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">
          Digital HMS Tavle er tilgjengelig som tillegg
        </p>
        <p className="text-xs text-blue-700/70">
          QR-innsjekk, UE-portal, kiosk-modus og mer — kr 290/mnd
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
      >
        <Link href="/dashboard/hms-tavle">
          Les mer
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
      <button
        onClick={handleDismiss}
        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-blue-700 hover:bg-blue-300 transition-colors"
        aria-label="Lukk"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
