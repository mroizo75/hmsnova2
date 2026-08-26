import { z } from "zod";
import { DocumentKind, DocStatus } from "@prisma/client";

const pdcaFields = {
  planSummary: z.string().max(10000).optional().nullable(),
  doSummary: z.string().max(10000).optional().nullable(),
  checkSummary: z.string().max(10000).optional().nullable(),
  actSummary: z.string().max(10000).optional().nullable(),
};

export const createDocumentSchema = z.object({
  tenantId: z.string().cuid(),
  kind: z.nativeEnum(DocumentKind),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  version: z.string().min(1, "Versjon er påkrevd").default("v1.0"),
  ownerId: z.string().cuid().optional().nullable(),
  templateId: z.string().cuid().optional().nullable(),
  reviewIntervalMonths: z.number().int().min(1).max(36).default(12),
  effectiveFrom: z.date().optional().nullable(),
  effectiveTo: z.date().optional().nullable(),
  ...pdcaFields,
  file: z.any().optional(), // Blob | File - valideres ved runtime
});

export const updateDocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  kind: z.nativeEnum(DocumentKind).optional(),
  version: z.string().optional(),
  status: z.nativeEnum(DocStatus).optional(),
  visibleToRoles: z.array(z.string()).nullable().optional(),
  ownerId: z.string().cuid().nullable().optional(),
  templateId: z.string().cuid().nullable().optional(),
  reviewIntervalMonths: z.number().int().min(1).max(36).optional(),
  effectiveFrom: z.date().nullable().optional(),
  effectiveTo: z.date().nullable().optional(),
  ...pdcaFields,
});

export const approveDocumentSchema = z.object({
  id: z.string().cuid(),
  approvedBy: z.string(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ApproveDocumentInput = z.infer<typeof approveDocumentSchema>;

