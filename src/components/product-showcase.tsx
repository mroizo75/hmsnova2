"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardCheck, Shield, FileSearch, PenLine, FlaskConical } from "lucide-react";

const TABS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    image: "/images/mockups/dashboard.png",
    alt: "HMS Nova dashboard med modulfliser og oppfølgingsoversikt",
    caption: "Full oversikt over hele HMS-arbeidet – tiltak, avvik, risikoer og vernerunder samlet på ett sted.",
  },
  {
    id: "avvik",
    label: "Avviksoversikt",
    icon: ClipboardCheck,
    image: "/images/mockups/avvik.png",
    alt: "HMS Nova avviksrapportering med statistikk og hendelsestabell",
    caption: "Se alle avvik med status, alvorlighetsgrad og oppfølging. Filtrer på interne og eksterne hendelser.",
  },
  {
    id: "meld-avvik",
    label: "Meld avvik",
    icon: PenLine,
    image: "/images/mockups/meld-avvik.png",
    alt: "HMS Nova skjema for å melde nytt avvik",
    caption: "Meld avvik på under ett minutt. Velg type, beskriv hendelsen, last opp bilder – ferdig.",
  },
  {
    id: "avvik-detalj",
    label: "Avviksbehandling",
    icon: FileSearch,
    image: "/images/mockups/avvik-detalj.png",
    alt: "HMS Nova avviksdetalj med årsaksanalyse og tiltak",
    caption: "Komplett avviksbehandling med årsaksanalyse, tiltak og oppfølging – alt dokumentert og sporbart.",
  },
  {
    id: "risiko",
    label: "Risikovurdering",
    icon: Shield,
    image: "/images/mockups/risiko.png",
    alt: "HMS Nova risikovurdering med 5x5 risikomatrise og register",
    caption: "5x5-matrise som viser risiko før og etter tiltak. Tiltaksoppfølging og revisjonshistorikk inkludert.",
  },
  {
    id: "stoffkartotek",
    label: "Stoffkartotek",
    icon: FlaskConical,
    image: "/images/mockups/stoffkartotek.png",
    alt: "HMS Nova stoffkartotek med kjemikalieregister, faresymboler og SDS",
    caption: "Komplett kjemikalieregister med GHS-faresymboler, verneutstyr, sikkerhetsdatablad og isocyanat-varsling.",
  },
] as const;

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="rounded-xl border bg-background shadow-2xl overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">
              app.hmsnova.no
            </span>
          </div>
          <div className="relative aspect-[16/9] bg-muted/10">
            <Image
              src={active.image}
              alt={active.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
              priority={active.id === "dashboard"}
            />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
        {active.caption}
      </p>
    </div>
  );
}
