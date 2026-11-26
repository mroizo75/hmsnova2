import { z } from "zod";
import { INDUCTION_KEYS } from "@/features/assignments/lib/deployment-gate";

export const assignmentStatuses = ["PLANLAGT", "KLAR", "UTPLASSERT", "AVSLUTTET"] as const;

export const assignmentStatusLabels: Record<(typeof assignmentStatuses)[number], string> = {
  PLANLAGT: "Planlagt",
  KLAR: "Klar",
  UTPLASSERT: "Utplassert",
  AVSLUTTET: "Avsluttet",
};

const inductionShape = Object.fromEntries(INDUCTION_KEYS.map((key) => [key, z.boolean()])) as Record<
  (typeof INDUCTION_KEYS)[number],
  z.ZodBoolean
>;

export const inductionSchema = z.object(inductionShape);

const workplaceSchema = z.object({
  name: z.string().trim().min(2, "Navn på innleier må være minst 2 tegn").max(160),
  orgNumber: z.string().trim().max(20).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  contactEmail: z.union([z.string().email("Ugyldig e-post"), z.literal("")]).optional(),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  siteLeaderName: z.string().trim().max(120).optional().or(z.literal("")),
});

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dato må være på formen ÅÅÅÅ-MM-DD");

export const createAssignmentSchema = z
  .object({
    userId: z.string().cuid(),
    clientWorkplaceId: z.string().cuid().optional().or(z.literal("")),
    newWorkplace: workplaceSchema.optional(),
    projectId: z.string().cuid().optional().or(z.literal("")),
    competenceProfileId: z.string().cuid().optional().or(z.literal("")),
    roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
    status: z.enum(assignmentStatuses).default("PLANLAGT"),
    startDate: dateField,
    endDate: dateField.optional().or(z.literal("")),
    induction: inductionSchema,
    coordinationNoted: z.boolean().default(false),
    coordinationAt: dateField.optional().or(z.literal("")),
    coordinationContact: z.string().trim().max(120).optional().or(z.literal("")),
    clientRiskReceived: z.boolean().default(false),
    notes: z.string().trim().max(4000).optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.clientWorkplaceId) || Boolean(value.newWorkplace?.name), {
    message: "Velg en innleier eller registrer en ny",
    path: ["clientWorkplaceId"],
  });

export const updateAssignmentSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(assignmentStatuses),
  roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
  competenceProfileId: z.string().cuid().optional().or(z.literal("")),
  endDate: dateField.optional().or(z.literal("")),
  induction: inductionSchema,
  coordinationNoted: z.boolean(),
  coordinationAt: dateField.optional().or(z.literal("")),
  coordinationContact: z.string().trim().max(120).optional().or(z.literal("")),
  clientRiskReceived: z.boolean(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
