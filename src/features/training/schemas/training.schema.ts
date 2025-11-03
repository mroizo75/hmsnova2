import { z } from "zod";

/**
 * ISO 9001 - 7.2 Kompetanse
 * 
 * Organisasjonen skal:
 * a) Bestemme nødvendig kompetanse for personer som gjør arbeid som påvirker ytelse og effektivitet
 * b) Sikre at disse personene er kompetente basert på utdanning, opplæring eller erfaring
 * c) Der det er aktuelt, ta tiltak for å anskaffe nødvendig kompetanse og evaluere effektiviteten
 * d) Beholde aktuell dokumentert informasjon som bevis på kompetanse
 */

export const createTrainingSchema = z.object({
  tenantId: z.string().cuid(),
  userId: z.string().cuid(),
  courseKey: z.string().min(2, "Kurs ID må være minst 2 tegn"),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  provider: z.string().min(2, "Leverandør må være minst 2 tegn"),
  completedAt: z.date().optional(),
  validUntil: z.date().optional(), // For kurs med utløpsdato (f.eks. førstehjelpskurs)
  proofDocKey: z.string().optional(), // ISO 9001: Dokumentert bevis (sertifikat)
  isRequired: z.boolean().default(false), // Obligatorisk kurs for alle/visse roller
  effectiveness: z.string().optional(), // ISO 9001: Evaluering av effektivitet
});

export const updateTrainingSchema = z.object({
  id: z.string().cuid(),
  completedAt: z.date().optional(),
  validUntil: z.date().optional(),
  proofDocKey: z.string().optional(),
  effectiveness: z.string().optional(),
});

export const evaluateTrainingSchema = z.object({
  id: z.string().cuid(),
  effectiveness: z.string().min(20, "Evalueringen må være minst 20 tegn"),
  evaluatedBy: z.string().cuid(),
});

export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingInput = z.infer<typeof updateTrainingSchema>;
export type EvaluateTrainingInput = z.infer<typeof evaluateTrainingSchema>;

/**
 * Get training status
 */
export function getTrainingStatus(training: {
  completedAt: Date | null;
  validUntil: Date | null;
}): "NOT_STARTED" | "COMPLETED" | "VALID" | "EXPIRING_SOON" | "EXPIRED" {
  if (!training.completedAt) {
    return "NOT_STARTED";
  }

  if (!training.validUntil) {
    return "COMPLETED";
  }

  const now = new Date();
  const validUntil = new Date(training.validUntil);
  const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return "EXPIRED";
  } else if (daysUntilExpiry <= 30) {
    return "EXPIRING_SOON";
  } else {
    return "VALID";
  }
}

/**
 * Get status label
 */
export function getTrainingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "Ikke startet",
    COMPLETED: "Fullført",
    VALID: "Gyldig",
    EXPIRING_SOON: "Utløper snart",
    EXPIRED: "Utløpt",
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getTrainingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
    VALID: "bg-green-100 text-green-800 border-green-300",
    EXPIRING_SOON: "bg-yellow-100 text-black border-yellow-300", // Sort tekst på gul
    EXPIRED: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Standard HMS kurs som bør være i systemet
 */
export const STANDARD_COURSES = [
  {
    key: "hms-intro",
    title: "HMS Introduksjon",
    description: "Grunnleggende HMS-opplæring for alle ansatte",
    isRequired: true,
    validityYears: null, // Ikke utløpsdato
  },
  {
    key: "working-at-height",
    title: "Arbeid i høyden",
    description: "Sikker bruk av stige, stillas og fallutstyr",
    isRequired: false,
    validityYears: 3,
  },
  {
    key: "first-aid",
    title: "Førstehjelp",
    description: "Grunnleggende førstehjelp og hjerte-lungeredning",
    isRequired: false,
    validityYears: 2,
  },
  {
    key: "fire-safety",
    title: "Brannsikkerhet",
    description: "Brannvernopplæring og bruk av slokkeutstyr",
    isRequired: true,
    validityYears: 1,
  },
  {
    key: "chemical-handling",
    title: "Kjemikaliehåndtering",
    description: "Sikker håndtering og lagring av kjemikalier",
    isRequired: false,
    validityYears: 3,
  },
  {
    key: "forklift",
    title: "Truckførerbevis",
    description: "Godkjent opplæring for truckkjøring",
    isRequired: false,
    validityYears: 5,
  },
  {
    key: "hot-work",
    title: "Varmt arbeid",
    description: "Sertifikat for varmt arbeid (sveising, skjæring)",
    isRequired: false,
    validityYears: 3,
  },
  {
    key: "confined-space",
    title: "Arbeid i trange rom",
    description: "Sikkerhet ved arbeid i trange/lukkede rom",
    isRequired: false,
    validityYears: 3,
  },
];

