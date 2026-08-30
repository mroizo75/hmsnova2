/**
 * Zod-skjema for kompetanseprofiler og gap-analyse
 *
 * Hjemmel:
 *   AML § 3-2: opplæringsplikt
 *   AML § 3-5: HMS-opplæring for arbeidsgiver
 *   IK-HMS § 5 nr. 2: kunnskap og ferdigheter
 *   IK-HMS § 5 nr. 5: dokumentert oversikt over kompetansekrav
 */

import { z } from "zod";

export const RequiredLevelSchema = z.enum(["REQUIRED", "RECOMMENDED", "AWARENESS"]);
export const IndustrySchema = z.enum(["generell", "bygg", "helse", "transport"]);

// ─── Krav ───────────────────────────────────────────────────────────────────

export const RequirementInputSchema = z.object({
  courseKey: z.string().min(1, "Kursnøkkel er påkrevd"),
  requiredLevel: RequiredLevelSchema.default("REQUIRED"),
  priority: z.number().int().default(0),
  legalRef: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Profil ─────────────────────────────────────────────────────────────────

export const CreateProfileSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  industry: IndustrySchema.optional(),
  requirements: z.array(RequirementInputSchema).default([]),
});

export const UpdateProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Navn er påkrevd").optional(),
  description: z.string().optional(),
  industry: IndustrySchema.optional(),
  requirements: z.array(RequirementInputSchema).optional(),
});

// ─── Enkelt krav (legg til / fjern) ─────────────────────────────────────────

export const AddRequirementSchema = z.object({
  profileId: z.string().min(1),
  courseKey: z.string().min(1, "Kursnøkkel er påkrevd"),
  requiredLevel: RequiredLevelSchema.default("REQUIRED"),
  priority: z.number().int().default(0),
  legalRef: z.string().optional(),
  notes: z.string().optional(),
});

export const RemoveRequirementSchema = z.object({
  id: z.string().min(1),
});

// ─── Tilordning ─────────────────────────────────────────────────────────────

export const AssignProfileSchema = z.object({
  userId: z.string().min(1, "Ansatt er påkrevd"),
  profileId: z.string().min(1, "Profil er påkrevd"),
});

export const BulkAssignProfileSchema = z.object({
  profileId: z.string().min(1, "Profil er påkrevd"),
  userIds: z.array(z.string().min(1)).min(1, "Minst én ansatt er påkrevd"),
});

// ─── TypeScript-typer ───────────────────────────────────────────────────────

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AddRequirementInput = z.infer<typeof AddRequirementSchema>;
export type RemoveRequirementInput = z.infer<typeof RemoveRequirementSchema>;
export type AssignProfileInput = z.infer<typeof AssignProfileSchema>;
export type BulkAssignProfileInput = z.infer<typeof BulkAssignProfileSchema>;
