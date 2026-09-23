import { z } from "zod";

/**
 * Arbeidsutstyr med godkjenning.
 * Forskrift om utførelse av arbeid (FuA):
 * - § 12-5: utstyr med sikkerhetsfeil skal tas ut av bruk
 * - § 12-8: dokumentasjon av kontroll, hvem som utførte den, tilgjengelig for tilsyn
 * - § 13-1: arbeidsutstyr med krav om sakkyndig kontroll
 * - § 13-2: periodisk kontroll minst hver 12. måned
 * - § 13-4: attest skal oppbevares og kunne vises myndighet
 * Verkstedforskriften §§ 15–17: kalibrert kontrollutstyr på godkjent verksted.
 */

export const EQUIPMENT_APPROVAL_PATH = "/dashboard/utstyr";

/** Bransjer der arbeidsutstyr med godkjenning er en vanlig plikt. */
export const EQUIPMENT_APPROVAL_INDUSTRIES = [
  "automotive",
  "manufacturing",
  "construction",
  "marine",
  "offshore",
  "oil_gas",
  "elektro",
  "fiskeri",
  "bergverk",
  "agriculture",
  "transport",
] as const;

export const EQUIPMENT_CATEGORY_VALUES = [
  "BILLOFTER",
  "LOFT_HENGENDE",
  "LOFTEREDSKAP",
  "LOFTE_STABLEVOGN",
  "MASSEFORFLYTTING",
  "BERGINGSVOGN",
  "PERSONLOFTER",
  "HENGESTILLAS",
  "KLATRESTILLAS",
  "SCENERIGG",
  "BYGGEPLASSHEIS",
  "TRALLEBANE",
  "TRYKKUTSTYR",
  "KALIBRERT_KONTROLLUTSTYR",
  "ANNET",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORY_VALUES)[number];

export const EQUIPMENT_CATEGORY_OPTIONS: Array<{
  value: EquipmentCategory;
  label: string;
  legalNote: string;
}> = [
  { value: "BILLOFTER", label: "Billøfter", legalNote: "FuA § 13-1" },
  { value: "LOFT_HENGENDE", label: "Løfting av hengende last", legalNote: "FuA § 13-1" },
  { value: "LOFTEREDSKAP", label: "Løfteredskap", legalNote: "FuA § 13-1" },
  { value: "LOFTE_STABLEVOGN", label: "Løfte- og stablevogn", legalNote: "FuA § 13-1" },
  { value: "MASSEFORFLYTTING", label: "Masseforflyttingsmaskin over 15 kW", legalNote: "FuA § 13-1" },
  { value: "BERGINGSVOGN", label: "Arbeidsutstyr på bergingsvogn", legalNote: "FuA § 13-1" },
  { value: "PERSONLOFTER", label: "Personløfter / arbeidsplattform", legalNote: "FuA § 13-1" },
  { value: "HENGESTILLAS", label: "Hengestillas", legalNote: "FuA § 13-1" },
  { value: "KLATRESTILLAS", label: "Klatrestillas over 3 meter", legalNote: "FuA § 13-1" },
  { value: "SCENERIGG", label: "Studio- og scenerigg", legalNote: "FuA § 13-1" },
  { value: "BYGGEPLASSHEIS", label: "Byggeplassheis", legalNote: "FuA § 13-1" },
  { value: "TRALLEBANE", label: "Trallebane", legalNote: "FuA § 13-1" },
  {
    value: "TRYKKUTSTYR",
    label: "Trykkpåkjent utstyr",
    legalNote: "Forskrift om håndtering av farlig stoff",
  },
  {
    value: "KALIBRERT_KONTROLLUTSTYR",
    label: "Kalibrert kontrollutstyr",
    legalNote: "Verkstedforskriften §§ 15–17",
  },
  { value: "ANNET", label: "Annet godkjent utstyr", legalNote: "FuA § 12-3 og § 12-8" },
];

export const OPERATIONAL_STATUS_VALUES = ["IN_USE", "OUT_OF_SERVICE"] as const;
export type EquipmentOperationalStatus = (typeof OPERATIONAL_STATUS_VALUES)[number];

export type ApprovalValidity = "GYLDIG" | "UTLOPER" | "UTLOPT" | "UTTATT";

export const APPROVAL_VALIDITY_LABELS: Record<ApprovalValidity, string> = {
  GYLDIG: "Gyldig",
  UTLOPER: "Utløper snart",
  UTLOPT: "Utløpt",
  UTTATT: "Tatt ut av bruk",
};

/** To måneder: sakkyndig kontroll kan tas inntil to måneder før forfall, FuA § 13-2. */
export const APPROVAL_EXPIRING_WITHIN_DAYS = 60;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function industryHasEquipmentApproval(industry: string | null | undefined): boolean {
  const key = (industry ?? "").trim().toLowerCase();
  return (EQUIPMENT_APPROVAL_INDUSTRIES as readonly string[]).includes(key);
}

export function equipmentCategoryLabel(value: string): string {
  return EQUIPMENT_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Lagrer kalenderdato som UTC midt på dagen, så datoen ikke skifter tidssone. */
export function parseDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value.trim());
  if (!match) {
    throw new Error("Dato må være på formatet ÅÅÅÅ-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Ugyldig dato.");
  }
  return date;
}

export function formatApprovalDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

export function getApprovalValidity(input: {
  validTo: Date | string;
  operationalStatus: EquipmentOperationalStatus;
  now?: Date;
  expiringWithinDays?: number;
}): ApprovalValidity {
  if (input.operationalStatus === "OUT_OF_SERVICE") return "UTTATT";
  const validTo = input.validTo instanceof Date ? input.validTo : new Date(input.validTo);
  const today = utcDayNumber(input.now ?? new Date());
  const until = utcDayNumber(validTo);
  if (until < today) return "UTLOPT";
  const window = input.expiringWithinDays ?? APPROVAL_EXPIRING_WITHIN_DAYS;
  if (until <= today + window) return "UTLOPER";
  return "GYLDIG";
}

/** FuA § 13-2: lengre intervall enn 12 måneder krever særskilt dokumentasjon. */
export function approvalIntervalExceedsAnnual(validFrom: Date | string, validTo: Date | string): boolean {
  const from = validFrom instanceof Date ? validFrom : new Date(validFrom);
  const to = validTo instanceof Date ? validTo : new Date(validTo);
  return utcDayNumber(to) - utcDayNumber(from) > 366;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    });

export const equipmentApprovalInputSchema = z
  .object({
    name: z.string().trim().min(2, "Navn på utstyret må være minst 2 tegn").max(200),
    category: z.enum(EQUIPMENT_CATEGORY_VALUES),
    supplierName: z.string().trim().min(2, "Leverandørnavn må være minst 2 tegn").max(200),
    approvalBody: z
      .string()
      .trim()
      .min(2, "Oppgi hvem som har utstedt godkjenningen")
      .max(200),
    certificateNumber: optionalText(120),
    serialNumber: optionalText(120),
    location: optionalText(200),
    validFrom: z.string().trim().regex(DATE_ONLY, "Gyldig fra må være en dato"),
    validTo: z.string().trim().regex(DATE_ONLY, "Gyldig til må være en dato"),
    operationalStatus: z.enum(OPERATIONAL_STATUS_VALUES),
    notes: optionalText(4000),
  })
  .superRefine((value, ctx) => {
    let from: Date;
    let to: Date;
    try {
      from = parseDateOnly(value.validFrom);
      to = parseDateOnly(value.validTo);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Ugyldig dato",
        path: ["validFrom"],
      });
      return;
    }
    if (to.getTime() < from.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Gyldig til må være samme dag eller senere enn gyldig fra.",
        path: ["validTo"],
      });
    }
  });

export type EquipmentApprovalInput = z.infer<typeof equipmentApprovalInputSchema>;
