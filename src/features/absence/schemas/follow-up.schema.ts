/**
 * Zod-skjema for sykefraværsoppfølging
 *
 * Hjemmel:
 *   AML § 4-6 (3): oppfølgingsplan innen 4 uker
 *   AML § 4-6 (4): dialogmøte 1 innen 7 uker
 *   Ftrl. § 8-7a: dialogmøte 2 innen 26 uker (NAV)
 *   AML § 4-6 (1): tilretteleggingsplikt
 */

import { z } from "zod";

export const FollowUpMilestoneSchema = z.enum([
  "FOLLOW_UP_PLAN",
  "DIALOG_MEETING_1",
  "ACTIVITY_REQUIREMENT",
  "DIALOG_MEETING_2",
  "DIALOG_MEETING_3",
  "MAX_DATE",
]);

export const FollowUpStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
]);

// ─── Fullfør milepæl ──────────────────────────────────────────────────────

export const CompleteFollowUpSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

// ─── Hopp over milepæl ("åpenbart unødvendig") ────────────────────────────

export const SkipFollowUpSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  skippedReason: z.string().min(1, "Begrunnelse for å hoppe over er påkrevd"),
});

// ─── Oppfølgingsplan (AML § 4-6 (3)) ─────────────────────────────────────

export const UpdateFollowUpPlanSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  workAssessment: z.string().min(1, "Vurdering av arbeidsoppgaver er påkrevd"),
  accommodations: z.string().min(1, "Tilretteleggingstiltak er påkrevd"),
  externalSupport: z.string().optional(),
  planSentToDoctor: z.boolean().optional(),
  planSentAt: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

// ─── Dialogmøte (AML § 4-6 (4), ftrl. § 8-7a) ───────────────────────────

export const UpdateDialogMeetingSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat (YYYY-MM-DD)"),
  meetingNotes: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  doctorAttended: z.boolean().optional(),
  navAttended: z.boolean().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

// ─── TypeScript-typer ───────────────────────────────────────────────────────

export type CompleteFollowUpInput = z.infer<typeof CompleteFollowUpSchema>;
export type SkipFollowUpInput = z.infer<typeof SkipFollowUpSchema>;
export type UpdateFollowUpPlanInput = z.infer<typeof UpdateFollowUpPlanSchema>;
export type UpdateDialogMeetingInput = z.infer<typeof UpdateDialogMeetingSchema>;
