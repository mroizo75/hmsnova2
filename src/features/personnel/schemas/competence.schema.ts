import { z } from "zod";

export const CompetenceDimensionSchema = z.enum(["KUNNSKAP", "FERDIGHET", "EVNE", "HOLDNING"]);
export const CompetenceLevelSchema = z.enum(["MANGLER", "DELVIS", "INNFRIDD"]);

export const CreateCompetenceStatementSchema = z.object({
  userId: z.string().min(1),
  dimension: CompetenceDimensionSchema,
  statement: z.string().trim().min(3, "Skriv en konkret setning").max(500),
});

export const SetCompetenceRatingSchema = z.object({
  userId: z.string().min(1),
  statementId: z.string().min(1),
  level: CompetenceLevelSchema,
  comment: z.string().trim().max(500).optional().nullable(),
  reviewId: z.string().min(1).optional().nullable(),
});

export const DeleteCompetenceStatementSchema = z.object({
  userId: z.string().min(1),
  statementId: z.string().min(1),
});

export const CopyCompetenceStatementsSchema = z.object({
  userId: z.string().min(1),
});

export const CreateProfileCompetenceStatementSchema = z.object({
  profileId: z.string().min(1),
  dimension: CompetenceDimensionSchema,
  statement: z.string().trim().min(3, "Skriv en konkret setning").max(500),
});

export const DeleteProfileCompetenceStatementSchema = z.object({
  profileId: z.string().min(1),
  statementId: z.string().min(1),
});
