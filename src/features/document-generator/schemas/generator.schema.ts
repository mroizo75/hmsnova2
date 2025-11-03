import { z } from "zod";

/**
 * HMS Document Generator Schemas
 * 
 * 5 steg for å generere komplett HMS-system
 */

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export const IndustryEnum = z.enum([
  "CONSTRUCTION",
  "HEALTHCARE",
  "TRANSPORT",
  "MANUFACTURING",
  "RETAIL",
  "HOSPITALITY",
  "EDUCATION",
  "TECHNOLOGY",
  "AGRICULTURE",
  "OTHER",
]);

export type Industry = z.infer<typeof IndustryEnum>;

export const EmployeeRangeEnum = z.enum([
  "1-5",
  "6-20",
  "21-50",
  "51+"
]);

// ═══════════════════════════════════════════════════════════════
// STEP 1: BEDRIFTSINFORMASJON
// ═══════════════════════════════════════════════════════════════

export const step1Schema = z.object({
  companyName: z.string().min(2, "Bedriftsnavn må være minst 2 tegn"),
  orgNumber: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  ceoName: z.string().min(2, "Daglig leder navn er påkrevd"),
  email: z.string().email("Ugyldig e-postadresse"),
  phone: z.string().optional(),
  employeeRange: EmployeeRangeEnum,
});

export type Step1Data = z.infer<typeof step1Schema>;

// ═══════════════════════════════════════════════════════════════
// STEP 2: BRANSJE & RISIKOER
// ═══════════════════════════════════════════════════════════════

export const step2Schema = z.object({
  industry: IndustryEnum,
  companyDescription: z.string().max(500, "Maksimum 500 tegn").optional(),
});

export type Step2Data = z.infer<typeof step2Schema>;

// ═══════════════════════════════════════════════════════════════
// STEP 3: HMS-ORGANISERING
// ═══════════════════════════════════════════════════════════════

export const step3Schema = z.object({
  hmsResponsible: z.string().min(2, "HMS-ansvarlig navn er påkrevd"),
  hmsEmail: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  hmsPhone: z.string().optional(),
  hmsIsCeo: z.boolean(),
  
  hasSafetyRep: z.boolean(),
  safetyRep: z.string().optional(),
  safetyRepEmail: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  safetyRepPhone: z.string().optional(),
  
  hasBHT: z.boolean(),
  bhtProvider: z.string().optional(),
  bhtContact: z.string().optional(),
  
  // Avdelinger (valgfritt)
  departments: z.array(z.object({
    name: z.string(),
    leader: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
  // Hvis hasSafetyRep er true, må safetyRep være utfylt
  if (data.hasSafetyRep && !data.safetyRep) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Verneombud navn er påkrevd når du har verneombud",
      path: ["safetyRep"],
    });
  }
  
  // Hvis hasBHT er true, må bhtProvider være utfylt
  if (data.hasBHT && !data.bhtProvider) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "BHT-leverandør er påkrevd når du har BHT-avtale",
      path: ["bhtProvider"],
    });
  }
  
  // Hvis hmsIsCeo er false, må hmsEmail være utfylt
  if (!data.hmsIsCeo) {
    if (!data.hmsEmail || data.hmsEmail === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-post er påkrevd for HMS-ansvarlig",
        path: ["hmsEmail"],
      });
    }
  }
});

export type Step3Data = z.infer<typeof step3Schema>;

// ═══════════════════════════════════════════════════════════════
// STEP 4: OPPLÆRING
// ═══════════════════════════════════════════════════════════════

export const step4Schema = z.object({
  hasHMSIntroduction: z.boolean(),
  hasAnnualTraining: z.boolean(),
  hasNoSystematicTraining: z.boolean(),
  
  // Bransjespesifikk opplæring (dynamisk basert på bransje)
  completedTraining: z.array(z.string()).optional(),
  
  // Førstehjelpskurs
  firstAidCount: z.enum(["0", "1", "2", "3-5", "6+"]),
  lastFirstAidDate: z.string().optional(),
});

export type Step4Data = z.infer<typeof step4Schema>;

// ═══════════════════════════════════════════════════════════════
// STEP 5: BEKREFTELSE
// ═══════════════════════════════════════════════════════════════

export const step5Schema = z.object({
  confirmEmail: z.string().email("Ugyldig e-postadresse"),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: "Du må godta personvernerklæringen",
  }),
  marketingConsent: z.boolean(),
});

export type Step5Data = z.infer<typeof step5Schema>;

// ═══════════════════════════════════════════════════════════════
// KOMPLETT FORM DATA
// ═══════════════════════════════════════════════════════════════

export const completeGeneratorSchema = z.object({
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
  step5: step5Schema,
});

export type CompleteGeneratorData = z.infer<typeof completeGeneratorSchema>;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getIndustryLabel(industry: Industry): string {
  const labels: Record<Industry, string> = {
    CONSTRUCTION: "Bygg og anlegg",
    HEALTHCARE: "Helsevesen",
    TRANSPORT: "Transport og logistikk",
    MANUFACTURING: "Industri og produksjon",
    RETAIL: "Handel og service",
    HOSPITALITY: "Hotell og restaurant",
    EDUCATION: "Utdanning",
    TECHNOLOGY: "Teknologi og IT",
    AGRICULTURE: "Landbruk",
    OTHER: "Annet",
  };
  return labels[industry];
}

export function getEmployeeCount(range: string): number {
  const counts: Record<string, number> = {
    "1-5": 3,
    "6-20": 13,
    "21-50": 35,
    "51+": 75,
  };
  return counts[range] || 10;
}

export const INDUSTRY_OPTIONS = [
  { value: "CONSTRUCTION", label: "Bygg og anlegg", riskCount: 25 },
  { value: "HEALTHCARE", label: "Helsevesen", riskCount: 18 },
  { value: "TRANSPORT", label: "Transport og logistikk", riskCount: 15 },
  { value: "MANUFACTURING", label: "Industri og produksjon", riskCount: 22 },
  { value: "RETAIL", label: "Handel og service", riskCount: 12 },
  { value: "HOSPITALITY", label: "Hotell og restaurant", riskCount: 14 },
  { value: "EDUCATION", label: "Utdanning", riskCount: 10 },
  { value: "TECHNOLOGY", label: "Teknologi og IT", riskCount: 8 },
  { value: "AGRICULTURE", label: "Landbruk", riskCount: 16 },
  { value: "OTHER", label: "Annet", riskCount: 10 },
] as const;

