import { z } from "zod";
import { FormCategory, FieldType } from "@prisma/client";

/**
 * Schema for creating a new form template
 * 
 * Eksempel: HMS Morgenmøte-skjema
 */
export const createFormTemplateSchema = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  description: z.string().optional(),
  category: z.nativeEnum(FormCategory).default("CUSTOM"),
  requiresSignature: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // RRULE format
});

/**
 * Schema for a single form field
 * 
 * Eksempel: "Antall deltakere" (NUMBER, påkrevd)
 */
export const createFormFieldSchema = z.object({
  formTemplateId: z.string().cuid(),
  fieldType: z.nativeEnum(FieldType),
  label: z.string().min(1, "Feltnavn er påkrevd"),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(1),
  validation: z.string().optional(), // JSON string: { min: 5, max: 100 }
  options: z.string().optional(), // JSON string: ["Ja", "Nei"]
  conditionalLogic: z.string().optional(), // JSON string: { showIf: { fieldId: "xyz", value: "Ja" } }
});

export type CreateFormTemplateInput = z.infer<typeof createFormTemplateSchema>;
export type CreateFormFieldInput = z.infer<typeof createFormFieldSchema>;

