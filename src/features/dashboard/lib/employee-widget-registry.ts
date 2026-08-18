import {
  Home,
  FileText,
  AlertCircle,
  Beaker,
  GraduationCap,
  FileWarning,
  HardHat,
  BookOpenCheck,
  Plug,
  ShieldAlert,
  Clock,
  Eye,
  Flame,
  Droplets,
  Stethoscope,
  Siren,
  SprayCan,
  UtensilsCrossed,
  ShieldCheck,
  MessageSquare,
  Headphones,
  type LucideIcon,
} from "lucide-react";

export interface EmployeeWidgetDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Admin widget-ID som denne ansatt-widgeten mapper til */
  adminWidgetId?: string;
  /** Om widgeten skal vises i bunnnavigasjonen */
  showInBottomNav?: boolean;
}

export const EMPLOYEE_WIDGET_REGISTRY: EmployeeWidgetDefinition[] = [
  {
    id: "emp-documents",
    label: "Dokumenter",
    description: "Les HMS-dokumenter og instrukser",
    icon: FileText,
    href: "/ansatt/dokumenter",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    adminWidgetId: "documents",
    showInBottomNav: true,
  },
  {
    id: "emp-incidents",
    label: "Avvik",
    description: "Meld avvik og uønskede hendelser",
    icon: AlertCircle,
    href: "/ansatt/avvik/ny",
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    adminWidgetId: "incidents",
    showInBottomNav: true,
  },
  {
    id: "emp-routines",
    label: "Rutiner",
    description: "Bedriftens rutiner og prosedyrer",
    icon: BookOpenCheck,
    href: "/ansatt/rutiner",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    adminWidgetId: "routines",
  },
  {
    id: "emp-electrical",
    label: "Samsvarserklæringer",
    description: "Elektro og faglige erklæringer",
    icon: Plug,
    href: "/ansatt/samsvarserklaringer",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    adminWidgetId: "electrical",
  },
  {
    id: "emp-ruh",
    label: "RUH",
    description: "Rapporter uønsket hendelse",
    icon: FileWarning,
    href: "/ansatt/ruh/ny",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    adminWidgetId: "ruh",
  },
  {
    id: "emp-sja",
    label: "SJA",
    description: "Sikker Jobb Analyse",
    icon: HardHat,
    href: "/ansatt/sja",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    adminWidgetId: "sja",
  },
  {
    id: "emp-chemicals",
    label: "Stoffkartotek",
    description: "Kjemikalier og sikkerhetsdatablad",
    icon: Beaker,
    href: "/ansatt/stoffkartotek",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
    adminWidgetId: "chemicals",
    showInBottomNav: true,
  },
  {
    id: "emp-training",
    label: "Opplæring",
    description: "Kurs og kompetanseoversikt",
    icon: GraduationCap,
    href: "/ansatt/opplaering",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    adminWidgetId: "training",
    showInBottomNav: true,
  },
  {
    id: "emp-fire-safety",
    label: "Brannøvelser",
    description: "Planlagte og gjennomførte brannøvelser",
    icon: Flame,
    href: "/ansatt/brannoevelser",
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    adminWidgetId: "fire-safety",
  },
  {
    id: "emp-inspections",
    label: "Vernerunder",
    description: "Deltakelse i vernerunder",
    icon: Eye,
    href: "/ansatt/vernerunder",
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    borderColor: "border-teal-300",
    adminWidgetId: "inspections",
  },
  {
    id: "emp-medicine",
    label: "Medisin",
    description: "Medisinoversikt og kontroller",
    icon: Stethoscope,
    href: "/ansatt/rutiner?q=medisin",
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-300",
    adminWidgetId: "medicine",
  },
  {
    id: "emp-medical-equipment",
    label: "Medisinsk utstyr",
    description: "Utstyrsoversikt og vedlikehold",
    icon: Siren,
    href: "/ansatt/rutiner?q=medisinsk%20utstyr",
    color: "text-rose-600",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-300",
    adminWidgetId: "medical-equipment",
  },
  {
    id: "emp-food-safety",
    label: "Matsikkerhet",
    description: "Hygienekontroll og matsjekklister",
    icon: UtensilsCrossed,
    href: "/ansatt/rutiner?q=mat",
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
    adminWidgetId: "food-safety",
  },
  {
    id: "emp-cleaning",
    label: "Renhold",
    description: "Renholdskontroll og sjekklister",
    icon: SprayCan,
    href: "/ansatt/rutiner?q=renhold",
    color: "text-sky-600",
    bgColor: "bg-sky-100",
    borderColor: "border-sky-300",
    adminWidgetId: "cleaning",
  },
  {
    id: "emp-water-safety",
    label: "Vannsikkerhet",
    description: "Legionella-kontroll og vannsjekk",
    icon: Droplets,
    href: "/ansatt/rutiner?q=vann",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-300",
    adminWidgetId: "water-safety",
  },
  {
    id: "emp-bcm",
    label: "Beredskap",
    description: "Beredskapsplaner og rutiner",
    icon: ShieldCheck,
    href: "/ansatt/rutiner?q=beredskap",
    color: "text-rose-700",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-300",
    adminWidgetId: "bcm",
  },
  {
    id: "emp-employee-reviews",
    label: "Medarbeidersamtaler",
    description: "Se og forbered dine medarbeidersamtaler",
    icon: MessageSquare,
    href: "/ansatt/medarbeidersamtale",
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-300",
    adminWidgetId: "employee-reviews",
  },
  {
    id: "emp-whistleblowing",
    label: "Varsling",
    description: "Anonym varsling av kritikkverdige forhold",
    icon: ShieldAlert,
    href: "/ansatt/varsling",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
  },
  {
    id: "emp-time",
    label: "Timeføring",
    description: "Registrer timer og kjøring",
    icon: Clock,
    href: "/ansatt/timeregistrering",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
  },
  {
    id: "emp-support",
    label: "Hjelp",
    description: "Chat med HMS-representantene våre",
    icon: Headphones,
    href: "/ansatt/hjelp",
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-300",
    showInBottomNav: true,
  },
];

export const DEFAULT_EMPLOYEE_WIDGET_IDS = EMPLOYEE_WIDGET_REGISTRY.map((w) => w.id);

/**
 * Filtrerer ansatt-widgets basert på admin-dashboardets lockedDashboardConfig.
 * Widgets uten adminWidgetId (varsling, timeføring) vises alltid.
 */
export function getEmployeeWidgetsFromLockedConfig(
  lockedConfig: Array<{ id: string }> | null | undefined
): EmployeeWidgetDefinition[] {
  if (!lockedConfig || lockedConfig.length === 0) {
    return EMPLOYEE_WIDGET_REGISTRY;
  }

  const adminWidgetIds = new Set(lockedConfig.map((w) => w.id));

  return EMPLOYEE_WIDGET_REGISTRY.filter((empWidget) => {
    if (!empWidget.adminWidgetId) return true;
    return adminWidgetIds.has(empWidget.adminWidgetId);
  });
}

export function getEmployeeBottomNavItems(
  widgets: EmployeeWidgetDefinition[]
): EmployeeWidgetDefinition[] {
  return widgets.filter((w) => w.showInBottomNav);
}
