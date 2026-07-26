/**
 * Forhåndsdefinerte HMS-snarveier for Digital HMS Tavle.
 *
 * Hver snarvei har:
 *  - id: unik nøkkel lagret i config
 *  - label: vises på knappen
 *  - icon: Lucide-ikonnavn
 *  - color: Tailwind bg-farge for knappen
 *  - hmsFunksjon: intern HMS Nova-sti (brukes automatisk for ADDON-plan)
 *  - lovRef: valgfri paragraf-referanse som vises under knappen
 */

export interface SnarveiDefinisjon {
  id: string;
  label: string;
  icon: string;
  color: string;        // Tailwind bg-klasse
  textColor: string;    // Tailwind text-klasse
  hmsFunksjon: string;  // relativ sti i HMS Nova: /dashboard/...
  lovRef?: string;
}

export const ALLE_SNARVEIER: SnarveiDefinisjon[] = [
  {
    id: "avvik",
    label: "Avvik / RUH",
    icon: "AlertTriangle",
    color: "bg-red-500/20 hover:bg-red-500/40 border-red-500/40",
    textColor: "text-red-300",
    hmsFunksjon: "/dashboard/avvik/ny",
    lovRef: "AML § 5-2",
  },
  {
    id: "sja",
    label: "SJA",
    icon: "Shield",
    color: "bg-orange-500/20 hover:bg-orange-500/40 border-orange-500/40",
    textColor: "text-orange-300",
    hmsFunksjon: "/dashboard/sja/ny",
    lovRef: "AML § 3-1",
  },
  {
    id: "sha_plan",
    label: "SHA-plan",
    icon: "ClipboardList",
    color: "bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/40",
    textColor: "text-blue-300",
    hmsFunksjon: "/dashboard/sha-plan",
    lovRef: "§ 7+8",
  },
  {
    id: "vernerunde",
    label: "Vernerunde",
    icon: "Search",
    color: "bg-green-500/20 hover:bg-green-500/40 border-green-500/40",
    textColor: "text-green-300",
    hmsFunksjon: "/dashboard/vernerunder",
    lovRef: "AML § 6-2",
  },
  {
    id: "innsjekk",
    label: "Innsjekk",
    icon: "UserCheck",
    color: "bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-500/40",
    textColor: "text-emerald-300",
    hmsFunksjon: "", // håndteres via publicToken
    lovRef: "§ 15",
  },
  {
    id: "dokumenter",
    label: "Dokumenter",
    icon: "FolderOpen",
    color: "bg-purple-500/20 hover:bg-purple-500/40 border-purple-500/40",
    textColor: "text-purple-300",
    hmsFunksjon: "/dashboard/dokumenter",
  },
  {
    id: "stoffkartotek",
    label: "Stoffkartotek",
    icon: "FlaskConical",
    color: "bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500/40",
    textColor: "text-yellow-300",
    hmsFunksjon: "/dashboard/stoffkartotek",
    lovRef: "Kjemforskriften",
  },
  {
    id: "opplaering",
    label: "Opplæring",
    icon: "GraduationCap",
    color: "bg-indigo-500/20 hover:bg-indigo-500/40 border-indigo-500/40",
    textColor: "text-indigo-300",
    hmsFunksjon: "/dashboard/opplaering",
    lovRef: "AML § 3-2",
  },
  {
    id: "risiko",
    label: "Risikovurdering",
    icon: "Gauge",
    color: "bg-rose-500/20 hover:bg-rose-500/40 border-rose-500/40",
    textColor: "text-rose-300",
    hmsFunksjon: "/dashboard/risiko",
    lovRef: "IK-HMS § 5",
  },
  {
    id: "tiltak",
    label: "Tiltak",
    icon: "Wrench",
    color: "bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/40",
    textColor: "text-cyan-300",
    hmsFunksjon: "/dashboard/tiltak",
  },
  {
    id: "timeregistrering",
    label: "Timeregistrering",
    icon: "Clock",
    color: "bg-slate-500/20 hover:bg-slate-500/40 border-slate-500/40",
    textColor: "text-slate-300",
    hmsFunksjon: "/dashboard/timer",
    lovRef: "Arbeidstidsloven",
  },
  {
    id: "varsling",
    label: "Varsling",
    icon: "Bell",
    color: "bg-amber-500/20 hover:bg-amber-500/40 border-amber-500/40",
    textColor: "text-amber-300",
    hmsFunksjon: "/dashboard/whistleblowing",
    lovRef: "Varslerloven § 2",
  },
];

export interface SnarveiConfig {
  id: string;
  isVisible: boolean;
  externalUrl?: string;   // Overstyrer HMS Nova-lenke for standalone/egne systemer
  customLabel?: string;   // Valgfritt egendefinert navn
}

/** Hent definisjon for én snarvei */
export function getSnarveiDef(id: string): SnarveiDefinisjon | undefined {
  return ALLE_SNARVEIER.find((s) => s.id === id);
}

/** Standard-konfig: avvik, sja, sha_plan, vernerunde, innsjekk synlige */
export const DEFAULT_SNARVEIER_CONFIG: SnarveiConfig[] = ALLE_SNARVEIER.map((s) => ({
  id: s.id,
  isVisible: ["avvik", "sja", "sha_plan", "vernerunde", "innsjekk"].includes(s.id),
  externalUrl: "",
  customLabel: "",
}));
