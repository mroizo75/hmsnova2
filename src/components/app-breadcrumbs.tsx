"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { BCM_PATH } from "@/lib/bcm-audit";

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  documents: "Dokumenter",
  samsvarserklaringer: "Samsvarserklæringer",
  "juridisk-register": "Juridisk register",
  incidents: "Avvik",
  statistics: "Statistikk",
  projects: "Prosjekter",
  "construction-compliance": "Bygg/anlegg-compliance",
  sja: "SJA",
  inspections: "Vernerunder",
  training: "Opplaering",
  actions: "Tiltak",
  chemicals: "Stoffkartotek",
  "exposure-register": "Eksponeringsregister",
  fill: "Utfylling",
  risks: "Risikovurderinger",
  "risk-register": "Risikoregister",
  wellbeing: "Psykososialt",
  complaints: "Klagebehandling",
  feedback: "Tilbakemeldinger",
  environment: "Miljo",
  bcm: "Beredskap",
  audits: "Revisjoner",
  "management-reviews": "Ledelsens gjennomgang",
  "annual-hms-plan": "Aarsplan HMS",
  meetings: "Moter",
  "time-registration": "Timeregistrering",
  whistleblowing: "Varsling",
  goals: "Mal",
  settings: "Innstillinger",
  ansatt: "Ansatt",
  profil: "Profil",
  dokumenter: "Dokumenter",
  avvik: "Avvik",
  moc: "Endringsledelse",
  ny: "Ny registrering",
  new: "Ny",
  ruh: "RUH",
  stoffkartotek: "Stoffkartotek",
  opplaering: "Opplaering",
  timeregistrering: "Timeregistrering",
  konsern: "Konsern",
  bedrifter: "Bedrifter",
  brukere: "Brukere",
  innhold: "Innhold",
  distribusjon: "Distribusjon",
  meldinger: "Meldinger",
  psykososialt: "Psykososialt",
  rapporter: "Rapporter",
  logg: "Revisjonslogg",
  innstillinger: "Innstillinger",
  rediger: "Rediger",
  planer: "Planer",
  ovelser: "Øvelser",
  skjemaer: "Skjemaer",
  rutiner: "Rutiner",
  risikovurderinger: "Risikovurderinger",
  vernerunder: "Vernerunder",
  ansatte: "Ansatte",
  varsling: "Varsling",
  arshjul: "HMS Årshjul",
  kompetanse: "Kompetanse",
};

function isLikelyEntityId(segment: string): boolean {
  return /^[a-z0-9_-]{10,}$/i.test(segment);
}

function formatSegmentLabel(segment: string, previousSegment?: string): string {
  if (isLikelyEntityId(segment)) {
    if (previousSegment === "projects") return "Prosjekt";
    if (previousSegment === "incidents") return "Avvik";
    if (previousSegment === "bedrifter") return "Bedrift";
    if (previousSegment === "ovelser") return "Øvelse";
    if (previousSegment === "planer") return "Plan";
    if (previousSegment === "skjemaer") return "Skjema";
    return "Detalj";
  }

  const mapped = segmentLabels[segment];
  if (mapped) return mapped;

  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AppBreadcrumbs() {
  return (
    <Suspense fallback={null}>
      <AppBreadcrumbsInner />
    </Suspense>
  );
}

function AppBreadcrumbsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromBcm = searchParams.get("from") === "bcm";
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;
  if (segments[0] !== "dashboard" && segments[0] !== "ansatt" && segments[0] !== "konsern") return null;

  const crumbs = segments
    .map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const previousSegment = index > 0 ? segments[index - 1] : undefined;
      const isLast = index === segments.length - 1;
      const isBcmNested =
        segments[0] === "dashboard" &&
        segments[1] === "bcm" &&
        (segment === "planer" || segment === "ovelser" || segment === "skjemaer");
      if (isBcmNested && !isLast) {
        return null;
      }
      if (fromBcm && segment === "audits") {
        return { href: BCM_PATH, label: "Beredskap", isLast };
      }
      if (fromBcm && previousSegment === "audits" && isLikelyEntityId(segment)) {
        return {
          href: `${href}?from=bcm`,
          label: "Øvelse",
          isLast,
        };
      }
      if (fromBcm && segment === "new" && previousSegment === "audits") {
        return { href, label: "Ny øvelse", isLast };
      }
      if (segment === "ny" && previousSegment === "ovelser") {
        return { href, label: "Ny øvelse", isLast };
      }
      const label = formatSegmentLabel(segment, previousSegment);
      return { href, label, isLast };
    })
    .filter((crumb): crumb is { href: string; label: string; isLast: boolean } => crumb != null);

  return (
    <nav aria-label="Brodsmulesti" className="mb-4 border-b pb-3 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {index === 0 ? <Home className="h-4 w-4" aria-hidden="true" /> : null}
            {crumb.isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            )}
            {!crumb.isLast ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
