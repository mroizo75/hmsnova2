/**
 * Zod-skjema for personalarkiv.
 * Hjemmel: GDPR art. 5, 6, 15 og 17. AML § 14-5/14-6.
 */

import { z } from "zod";
import { PERSONNEL_CATEGORIES } from "@/features/personnel/lib/personnel-categories";

export const PersonnelCategorySchema = z.enum(PERSONNEL_CATEGORIES);

export const UpdatePersonnelDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Tittel er påkrevd").max(191).optional(),
  retainUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig datoformat (YYYY-MM-DD)")
    .nullable()
    .optional(),
  notes: z.string().max(4000).optional(),
});

export const DeletePersonnelDocumentSchema = z.object({
  id: z.string().min(1, "ID er påkrevd"),
});

export type UpdatePersonnelDocumentInput = z.infer<typeof UpdatePersonnelDocumentSchema>;
export type DeletePersonnelDocumentInput = z.infer<typeof DeletePersonnelDocumentSchema>;
