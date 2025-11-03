import { z } from "zod";
import { IncidentType } from "@prisma/client";

/**
 * ISO 9001 - 10.2 Avvik og korrigerende tiltak
 * 
 * Krav:
 * a) Reagere på avvik, og om aktuelt:
 *    1) iverksette tiltak for å kontrollere og rette opp i avviket
 *    2) håndtere konsekvensene
 * b) Vurdere behovet for tiltak for å eliminere årsakene til avviket
 * c) Implementere nødvendige tiltak
 * d) Gjennomgå effektiviteten av korrigerende tiltak som er iverksatt
 * e) Oppdatere risikoer og muligheter bestemt under planlegging, om nødvendig
 * f) Foreta endringer i kvalitetsstyringssystemet, om nødvendig
 * 
 * Avvik skal dokumenteres og bevares som dokumentert informasjon.
 */

export const createIncidentSchema = z.object({
  tenantId: z.string().cuid(),
  type: z.nativeEnum(IncidentType),
  title: z.string().min(5, "Tittel må være minst 5 tegn"),
  description: z.string().min(20, "Beskrivelse må være minst 20 tegn"),
  severity: z.number().int().min(1).max(5, "Alvorlighetsgrad må være 1-5"),
  occurredAt: z.date(),
  reportedBy: z.string().cuid(),
  location: z.string().optional(),
  witnessName: z.string().optional(),
  immediateAction: z.string().optional(), // ISO 9001: Umiddelbare tiltak
});

export const updateIncidentSchema = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(IncidentType).optional(),
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  severity: z.number().int().min(1).max(5).optional(),
  occurredAt: z.date().optional(),
  location: z.string().optional(),
  witnessName: z.string().optional(),
  immediateAction: z.string().optional(),
  rootCause: z.string().optional(), // ISO 9001: Årsaksanalyse
  status: z.enum(["OPEN", "INVESTIGATING", "ACTION_TAKEN", "CLOSED"]).optional(),
});

export const investigateIncidentSchema = z.object({
  id: z.string().cuid(),
  rootCause: z.string().min(20, "Årsaksanalyse må være minst 20 tegn"),
  contributingFactors: z.string().optional(),
  investigatedBy: z.string().cuid(),
});

export const closeIncidentSchema = z.object({
  id: z.string().cuid(),
  closedBy: z.string().cuid(),
  effectivenessReview: z.string().min(20, "Effektivitetsvurdering må være minst 20 tegn"),
  lessonsLearned: z.string().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type InvestigateIncidentInput = z.infer<typeof investigateIncidentSchema>;
export type CloseIncidentInput = z.infer<typeof closeIncidentSchema>;

/**
 * Get incident type label
 */
export function getIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    AVVIK: "Avvik",
    NESTEN: "Nestenulykke",
    SKADE: "Personskade",
    MILJO: "Miljøhendelse",
    KVALITET: "Kvalitetsavvik",
  };
  return labels[type];
}

/**
 * Get incident type color
 */
export function getIncidentTypeColor(type: IncidentType): string {
  const colors: Record<IncidentType, string> = {
    AVVIK: "bg-orange-100 text-orange-800 border-orange-300",
    NESTEN: "bg-yellow-100 text-yellow-800 border-yellow-300",
    SKADE: "bg-red-100 text-red-800 border-red-300",
    MILJO: "bg-green-100 text-green-800 border-green-300",
    KVALITET: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return colors[type];
}

/**
 * Get severity label and color
 */
export function getSeverityInfo(severity: number): { label: string; color: string; bgColor: string; textColor: string } {
  if (severity >= 5) {
    return {
      label: "Kritisk",
      color: "text-red-900",
      bgColor: "bg-red-100 border-red-300",
      textColor: "text-white",
    };
  } else if (severity >= 4) {
    return {
      label: "Alvorlig",
      color: "text-orange-900",
      bgColor: "bg-orange-100 border-orange-300",
      textColor: "text-white",
    };
  } else if (severity >= 3) {
    return {
      label: "Moderat",
      color: "text-yellow-900",
      bgColor: "bg-yellow-100 border-yellow-300",
      textColor: "text-black", // Sort tekst på gul bakgrunn
    };
  } else if (severity >= 2) {
    return {
      label: "Mindre",
      color: "text-blue-900",
      bgColor: "bg-blue-100 border-blue-300",
      textColor: "text-white",
    };
  } else {
    return {
      label: "Ubetydelig",
      color: "text-gray-900",
      bgColor: "bg-gray-100 border-gray-300",
      textColor: "text-black",
    };
  }
}

/**
 * Get status label
 */
export function getIncidentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "Åpen",
    INVESTIGATING: "Under utredning",
    ACTION_TAKEN: "Tiltak igangsatt",
    CLOSED: "Lukket",
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getIncidentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800 border-red-300",
    INVESTIGATING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ACTION_TAKEN: "bg-blue-100 text-blue-800 border-blue-300",
    CLOSED: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

