import type { SkjenkingBevillingInput } from "@/features/skjenking/lib/internkontroll";

export interface AlcoholTrainingStatus {
  courseKey: string;
  title: string;
  users: Array<{
    id: string;
    name: string;
    completed: boolean;
    validUntil: string | Date | null;
  }>;
}

export interface SkjenkeHendelseView {
  id: string;
  occurredAt: string;
  type: string;
  action: string;
  beruselsesgrad: string | null;
  registeredBy: string | null;
  note: string | null;
  korrigerendeTiltak: string | null;
  forebygging: string | null;
  status: string;
}

export interface SkjenkeRutineView {
  id: string;
  nokkel: string;
  tittel: string;
  lovhjemmel: string;
  innhold: string;
  aktiv: boolean;
}

export interface SkjenkeGjennomgangView {
  id: string;
  gjennomfortAt: string;
  gjennomfortAv: string;
  funn: string;
  tiltak: string | null;
  nesteDato: string | null;
}

export type SkjenkeBevillingView = SkjenkingBevillingInput & { id: string };

export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function fromDateInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const selectClass = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";
