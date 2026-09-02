/**
 * Zod-skjema for onboarding/offboarding
 *
 * Hjemmel:
 *   AML § 14-5/14-6: arbeidsavtale innen 7 dager
 *   AML § 3-2: opplæring og instruksjon
 *   AML § 2 A-6: varslingsrutiner
 *   AML § 15-15: sluttattest
 *   GDPR art. 13 og art. 17: informasjon og sletting
 */

import { z } from "zod";

export const BoardingTypeSchema = z.enum(["ONBOARDING", "OFFBOARDING"]);
export const BoardingStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const BoardingTaskStatusSchema = z.enum(["PENDING", "COMPLETED", "SKIPPED"]);
export const AssigneeRoleSchema = z.enum(["EMPLOYEE", "MANAGER", "HR", "IT"]);

// ─── Opprett boarding ──────────────────────────────────────────────────────

export const CreateBoardingSchema = z.object({
  employeeId: z.string().min(1, "Ansatt er påkrevd"),
  type: BoardingTypeSchema,
  templateId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Ugyldig datoformat (YYYY-MM-DD)"),
  notes: z.string().optional(),
});

// ─── Mal-opprettelse ───────────────────────────────────────────────────────

export const CreateTemplateTaskSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional(),
  assigneeRole: AssigneeRoleSchema,
  daysOffset: z.number().int(),
  sortOrder: z.number().int().default(0),
  category: z.string().optional(),
  isRequired: z.boolean().optional(),
  legalRef: z.string().optional(),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  type: BoardingTypeSchema,
  description: z.string().optional(),
  tasks: z.array(CreateTemplateTaskSchema).min(1, "Minst én oppgave er påkrevd"),
});

export const UpdateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Navn er påkrevd").optional(),
  description: z.string().optional(),
  tasks: z.array(CreateTemplateTaskSchema).optional(),
});

// ─── Oppgavehandlinger ─────────────────────────────────────────────────────

export const CompleteTaskSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  notes: z.string().optional(),
});

export const SkipTaskSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
  notes: z.string().optional(),
});

// ─── TypeScript-typer ───────────────────────────────────────────────────────

export type CreateBoardingInput = z.infer<typeof CreateBoardingSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>;
export type SkipTaskInput = z.infer<typeof SkipTaskSchema>;
