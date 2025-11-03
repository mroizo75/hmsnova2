import { z } from "zod";

/**
 * ISO 9001 - 9.2 Internrevisjon
 * 
 * Organisasjonen skal gjennomføre interne revisjoner med planlagte intervaller for å gi
 * informasjon om ledelsessystemet er:
 * a) I samsvar med organisasjonens egne krav for sitt ledelsessystem
 * b) I samsvar med kravene i denne internasjonale standarden
 * c) Effektivt implementert og vedlikeholdt
 * 
 * Organisasjonen skal:
 * - Planlegge, etablere, implementere og vedlikeholde et revisjonsprogram
 * - Definere revisjonskriterier og omfang for hver revisjon
 * - Velge revisorer og gjennomføre revisjoner for å sikre objektivitet og upartiskhet
 * - Sikre at resultatene rapporteres til relevant ledelse
 * - Ta korrigerende tiltak uten unødig forsinkelse
 * - Beholde dokumentert informasjon som bevis
 */

export const createAuditSchema = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(5, "Tittel må være minst 5 tegn"),
  auditType: z.enum(["INTERNAL", "EXTERNAL", "SUPPLIER", "CERTIFICATION"]),
  scope: z.string().min(20, "Omfang må være minst 20 tegn"),
  criteria: z.string().min(20, "Revisjonskriterier må være minst 20 tegn"),
  leadAuditorId: z.string().cuid(),
  teamMemberIds: z.array(z.string().cuid()).optional(),
  scheduledDate: z.date(),
  area: z.string().min(2, "Område må være minst 2 tegn"),
  department: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PLANNED"),
});

export const updateAuditSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).optional(),
  auditType: z.enum(["INTERNAL", "EXTERNAL", "SUPPLIER", "CERTIFICATION"]).optional(),
  scope: z.string().min(20).optional(),
  criteria: z.string().min(20).optional(),
  leadAuditorId: z.string().cuid().optional(),
  teamMemberIds: z.array(z.string().cuid()).optional(),
  scheduledDate: z.date().optional(),
  completedAt: z.date().optional(),
  area: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  summary: z.string().optional(),
  conclusion: z.string().optional(),
});

export const createFindingSchema = z.object({
  auditId: z.string().cuid(),
  findingType: z.enum(["MAJOR_NC", "MINOR_NC", "OBSERVATION", "STRENGTH"]),
  clause: z.string().min(1, "ISO 9001 klausul må spesifiseres"),
  description: z.string().min(20, "Beskrivelse må være minst 20 tegn"),
  evidence: z.string().min(10, "Bevis må være minst 10 tegn"),
  requirement: z.string().min(10, "Krav må være minst 10 tegn"),
  responsibleId: z.string().cuid(),
  dueDate: z.date().optional(),
});

export const updateFindingSchema = z.object({
  id: z.string().cuid(),
  findingType: z.enum(["MAJOR_NC", "MINOR_NC", "OBSERVATION", "STRENGTH"]).optional(),
  clause: z.string().optional(),
  description: z.string().optional(),
  evidence: z.string().optional(),
  requirement: z.string().optional(),
  responsibleId: z.string().cuid().optional(),
  dueDate: z.date().optional(),
  correctiveAction: z.string().optional(),
  rootCause: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"]).optional(),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
export type CreateFindingInput = z.infer<typeof createFindingSchema>;
export type UpdateFindingInput = z.infer<typeof updateFindingSchema>;

/**
 * Audit Type Labels (Norsk)
 */
export function getAuditTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INTERNAL: "Internrevisjon",
    EXTERNAL: "Ekstern revisjon",
    SUPPLIER: "Leverandørrevisjon",
    CERTIFICATION: "Sertifiseringsrevisjon",
  };
  return labels[type] || type;
}

/**
 * Audit Type Colors
 */
export function getAuditTypeColor(type: string): string {
  const colors: Record<string, string> = {
    INTERNAL: "bg-blue-100 text-blue-800 border-blue-300",
    EXTERNAL: "bg-purple-100 text-purple-800 border-purple-300",
    SUPPLIER: "bg-orange-100 text-orange-800 border-orange-300",
    CERTIFICATION: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Audit Status Labels
 */
export function getAuditStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLANNED: "Planlagt",
    IN_PROGRESS: "Pågår",
    COMPLETED: "Fullført",
    CANCELLED: "Avbrutt",
  };
  return labels[status] || status;
}

/**
 * Audit Status Colors
 */
export function getAuditStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLANNED: "bg-gray-100 text-gray-800 border-gray-300",
    IN_PROGRESS: "bg-yellow-100 text-black border-yellow-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Finding Type Labels
 */
export function getFindingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MAJOR_NC: "Større avvik",
    MINOR_NC: "Mindre avvik",
    OBSERVATION: "Observasjon",
    STRENGTH: "Styrke",
  };
  return labels[type] || type;
}

/**
 * Finding Type Colors
 */
export function getFindingTypeColor(type: string): string {
  const colors: Record<string, string> = {
    MAJOR_NC: "bg-red-100 text-red-800 border-red-300",
    MINOR_NC: "bg-orange-100 text-orange-800 border-orange-300",
    OBSERVATION: "bg-yellow-100 text-black border-yellow-300",
    STRENGTH: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Finding Status Labels
 */
export function getFindingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "Åpen",
    IN_PROGRESS: "Under arbeid",
    RESOLVED: "Løst",
    VERIFIED: "Verifisert",
  };
  return labels[status] || status;
}

/**
 * Finding Status Colors
 */
export function getFindingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800 border-red-300",
    IN_PROGRESS: "bg-yellow-100 text-black border-yellow-300",
    RESOLVED: "bg-blue-100 text-blue-800 border-blue-300",
    VERIFIED: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * ISO 9001 Standard Clauses (for checklist)
 */
export const ISO_9001_CLAUSES = [
  { clause: "4.1", title: "Forstå organisasjonen og dens kontekst" },
  { clause: "4.2", title: "Forstå interessenters behov og forventninger" },
  { clause: "4.3", title: "Bestemme omfanget til ledelsessystemet for kvalitet" },
  { clause: "4.4", title: "Ledelsessystem for kvalitet og dets prosesser" },
  { clause: "5.1", title: "Lederskap og forpliktelse" },
  { clause: "5.2", title: "Politikk" },
  { clause: "5.3", title: "Roller, ansvar og myndighet i organisasjonen" },
  { clause: "6.1", title: "Handlinger for å håndtere risikoer og muligheter" },
  { clause: "6.2", title: "Kvalitetsmål og planlegging for å oppnå dem" },
  { clause: "6.3", title: "Planlegging av endringer" },
  { clause: "7.1", title: "Ressurser" },
  { clause: "7.2", title: "Kompetanse" },
  { clause: "7.3", title: "Bevissthet" },
  { clause: "7.4", title: "Kommunikasjon" },
  { clause: "7.5", title: "Dokumentert informasjon" },
  { clause: "8.1", title: "Operasjonell planlegging og kontroll" },
  { clause: "8.2", title: "Krav til produkter og tjenester" },
  { clause: "8.3", title: "Utforming og utvikling av produkter og tjenester" },
  { clause: "8.4", title: "Kontroll av eksternt tilbudte produkter og tjenester" },
  { clause: "8.5", title: "Produksjon og tjenesteleveranse" },
  { clause: "8.6", title: "Frigivelse av produkter og tjenester" },
  { clause: "8.7", title: "Kontroll av avvikende resultat" },
  { clause: "9.1", title: "Overvåking, måling, analyse og evaluering" },
  { clause: "9.2", title: "Internrevisjon" },
  { clause: "9.3", title: "Ledelsens gjennomgang" },
  { clause: "10.1", title: "Generelt - Forbedring" },
  { clause: "10.2", title: "Avvik og korrigerende tiltak" },
  { clause: "10.3", title: "Kontinuerlig forbedring" },
];

