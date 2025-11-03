import { z } from "zod";
import { DocumentKind, DocStatus } from "@prisma/client";

export const createDocumentSchema = z.object({
  tenantId: z.string().cuid(),
  kind: z.nativeEnum(DocumentKind),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  version: z.string().min(1, "Versjon er påkrevd").default("v1.0"),
  file: z.instanceof(File).optional(),
});

export const updateDocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  kind: z.nativeEnum(DocumentKind).optional(),
  version: z.string().optional(),
  status: z.nativeEnum(DocStatus).optional(),
});

export const approveDocumentSchema = z.object({
  id: z.string().cuid(),
  approvedBy: z.string(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ApproveDocumentInput = z.infer<typeof approveDocumentSchema>;

