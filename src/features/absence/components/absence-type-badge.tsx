import { Badge } from "@/components/ui/badge";
import type { AbsenceType } from "@prisma/client";

const typeConfig: Record<
  AbsenceType,
  { label: string; className: string }
> = {
  SELF_CERTIFIED: {
    label: "Egenmelding",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  SICK_LEAVE: {
    label: "Sykemelding",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  PARENTAL_LEAVE: {
    label: "Foreldrepermisjon",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  VACATION: {
    label: "Ferie",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  LEAVE_OF_ABSENCE: {
    label: "Permisjon",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  COMPENSATORY: {
    label: "Avspasering",
    className: "bg-teal-100 text-teal-800 border-teal-200",
  },
  CARE_DAYS: {
    label: "Omsorgsdager",
    className: "bg-pink-100 text-pink-800 border-pink-200",
  },
  MILITARY: {
    label: "Militærtjeneste",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
  BEREAVEMENT: {
    label: "Velferdspermisjon",
    className: "bg-stone-100 text-stone-800 border-stone-200",
  },
  OTHER: {
    label: "Annet",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

export function AbsenceTypeBadge({ type }: { type: AbsenceType }) {
  const config = typeConfig[type];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function getAbsenceTypeLabel(type: AbsenceType): string {
  return typeConfig[type].label;
}

export function getAbsenceTypeColor(type: AbsenceType): string {
  return typeConfig[type].className;
}
