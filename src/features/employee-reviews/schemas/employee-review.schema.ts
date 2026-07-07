/**
 * Zod-skjema for medarbeidersamtale
 *
 * Hjemmel:
 *   AML § 4-2 (2): tilrettelegging for faglig og personlig utvikling
 *   AML § 4-3 (presisert 1. jan 2026): psykososiale arbeidsmiljøfaktorer
 *   IK-HMS § 5: systematisk HMS-arbeid og tiltaksoppfølging
 *   GDPR art. 5 og 9: personvern og konfidensialitet
 */

import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const EmployeeReviewStatusSchema = z.enum([
  "PLANLAGT",
  "FORBEREDT",
  "GJENNOMFORT",
  "SIGNERT",
  "AVBRUTT",
]);

export const EmployeeReviewGoalStatusSchema = z.enum([
  "IKKE_STARTET",
  "PAGAENDE",
  "OPPNADD",
  "IKKE_OPPNADD",
]);

export const EmployeeReviewGoalCategorySchema = z.enum([
  "FAGLIG",
  "PERSONLIG",
  "VIRKSOMHET",
]);

export const PsykososialtNivaSchema = z.enum([
  "FORSVARLIG",
  "DELVIS_FORSVARLIG",
  "IKKE_FORSVARLIG",
]);

// ─── Mål ────────────────────────────────────────────────────────────────────

export const EmployeeReviewGoalSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  category: EmployeeReviewGoalCategorySchema.default("FAGLIG"),
  status: EmployeeReviewGoalStatusSchema.default("IKKE_STARTET"),
  deadline: z.coerce.date().optional().nullable(),
  note: z.string().optional().nullable(),
  overfortTilNeste: z.boolean().default(false),
});

// ─── Tiltak ─────────────────────────────────────────────────────────────────

export const EmployeeReviewActionSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  ansvarlig: z.enum(["LEDER", "ANSATT", "BEGGE"]).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  completed: z.boolean().default(false),
  note: z.string().optional().nullable(),
});

// ─── Opprett samtale ────────────────────────────────────────────────────────

export const CreateEmployeeReviewSchema = z.object({
  employeeId: z.string().min(1, "Ansatt er påkrevd"),
  scheduledDate: z.coerce.date({ error: "Dato er påkrevd" }),
  nextReviewDate: z.coerce.date().optional().nullable(),
  konfidensielt: z.boolean().default(true),
});

// ─── Oppdater – ansattens forberedelse ──────────────────────────────────────

export const UpdateAnsattForberedelseSchema = z.object({
  ansattForberedelse: z.string().optional().nullable(),
  ansattMedvirkning: z.string().optional().nullable(),
});

// ─── Oppdater – arbeidssituasjon og trivsel ─────────────────────────────────

export const UpdateArbeidssituasjonSchema = z.object({
  // AML § 4-2: trivsel, arbeidsmiljø og samarbeid
  trivselScore: z.number().int().min(1).max(5).optional().nullable(),
  arbeidsmiljoeScore: z.number().int().min(1).max(5).optional().nullable(),
  samarbeidScore: z.number().int().min(1).max(5).optional().nullable(),

  // AML § 4-3 (2026) – psykososiale faktorer
  psykKravOgForventninger: PsykososialtNivaSchema.optional().nullable(),
  psykEmosjonelleKrav: PsykososialtNivaSchema.optional().nullable(),
  psykArbeidsmengde: PsykososialtNivaSchema.optional().nullable(),
  psykStotteOgHjelp: PsykososialtNivaSchema.optional().nullable(),
  psykKommentar: z.string().optional().nullable(),
});

// ─── Oppdater – mål og kompetanse ───────────────────────────────────────────

export const UpdateMalOgKompetanseSchema = z.object({
  maloppnaelseKommentar: z.string().optional().nullable(),
  kompetanseKommentar: z.string().optional().nullable(),
  opplaeringsOnske: z.string().optional().nullable(),
  karrierePlaner: z.string().optional().nullable(),
});

// ─── Oppdater – tilrettelegging og tilbakemelding ───────────────────────────

export const UpdateTilretteleggingSchema = z.object({
  tilretteleggingBehov: z.string().optional().nullable(),
  arbeidstidKommentar: z.string().optional().nullable(),
  lederTilbakemeldingTilAnsatt: z.string().optional().nullable(),
  ansattTilbakemeldingTilLeder: z.string().optional().nullable(),
  oppsummeringKommentar: z.string().optional().nullable(),
});

// ─── Oppdater – generell (full patch) ───────────────────────────────────────

export const UpdateEmployeeReviewSchema = z
  .object({
    scheduledDate: z.coerce.date().optional(),
    completedDate: z.coerce.date().optional().nullable(),
    nextReviewDate: z.coerce.date().optional().nullable(),
    status: EmployeeReviewStatusSchema.optional(),
    konfidensielt: z.boolean().optional(),
  })
  .merge(UpdateAnsattForberedelseSchema)
  .merge(UpdateArbeidssituasjonSchema)
  .merge(UpdateMalOgKompetanseSchema)
  .merge(UpdateTilretteleggingSchema);

// ─── TypeScript-typer ───────────────────────────────────────────────────────

export type CreateEmployeeReviewInput = z.infer<typeof CreateEmployeeReviewSchema>;
export type UpdateEmployeeReviewInput = z.infer<typeof UpdateEmployeeReviewSchema>;
export type EmployeeReviewGoalInput = z.infer<typeof EmployeeReviewGoalSchema>;
export type EmployeeReviewActionInput = z.infer<typeof EmployeeReviewActionSchema>;
