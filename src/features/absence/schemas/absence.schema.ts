/**
 * Zod-skjema for fraværsmodul
 *
 * Hjemmel:
 *   AML § 5-1 (4): arbeidsgiver skal føre statistikk over sykefravær
 *   AML § 8-24 / folketrygdloven § 8-23..§ 8-27: egenmelding
 *   Ferieloven § 5: ferieavvikling og godkjenning
 *   GDPR art. 9: helseopplysninger (diagnosekode) krever særskilt grunnlag
 *   IK-HMS § 5: systematisk HMS-arbeid
 */

import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const AbsenceTypeSchema = z.enum([
  "SELF_CERTIFIED",
  "SICK_LEAVE",
  "PARENTAL_LEAVE",
  "VACATION",
  "LEAVE_OF_ABSENCE",
  "COMPENSATORY",
  "CARE_DAYS",
  "MILITARY",
  "BEREAVEMENT",
  "OTHER",
]);

export const AbsenceStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

// ─── Opprett fravær ─────────────────────────────────────────────────────────

export const CreateAbsenceSchema = z
  .object({
    type: AbsenceTypeSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat (YYYY-MM-DD)"),
    percentage: z.number().int().min(1).max(100).default(100),
    reason: z.string().optional(),
    doctorName: z.string().optional(),
    diagnosisCode: z.string().optional(),
    selfCertifiedDays: z.number().int().min(1).optional(),
    userId: z.string().optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Sluttdato kan ikke være før startdato",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.type !== "SELF_CERTIFIED" ||
      (data.selfCertifiedDays !== undefined && data.selfCertifiedDays > 0),
    {
      message: "Antall egenmeldingsdager er påkrevd for egenmelding",
      path: ["selfCertifiedDays"],
    },
  );

// ─── Oppdater fravær ────────────────────────────────────────────────────────

export const UpdateAbsenceSchema = z
  .object({
    id: z.string().min(1, "ID er påkrevd"),
    type: AbsenceTypeSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat").optional(),
    percentage: z.number().int().min(1).max(100).optional(),
    reason: z.string().optional(),
    doctorName: z.string().optional(),
    diagnosisCode: z.string().optional(),
    selfCertifiedDays: z.number().int().min(1).optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return data.endDate >= data.startDate;
      return true;
    },
    { message: "Sluttdato kan ikke være før startdato", path: ["endDate"] },
  );

// ─── Godkjenn fravær ────────────────────────────────────────────────────────

export const ApproveAbsenceSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
});

// ─── Avvis fravær ───────────────────────────────────────────────────────────

export const RejectAbsenceSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  rejectedReason: z.string().optional(),
});

// ─── TypeScript-typer ───────────────────────────────────────────────────────

export type CreateAbsenceInput = z.infer<typeof CreateAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof UpdateAbsenceSchema>;
export type ApproveAbsenceInput = z.infer<typeof ApproveAbsenceSchema>;
export type RejectAbsenceInput = z.infer<typeof RejectAbsenceSchema>;
