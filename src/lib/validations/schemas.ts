import { z } from "zod";

/**
 * SIKKERHET: Input validering for API-endepunkter
 * 
 * Bruker Zod for type-safe validering av all input fra klienter
 * Beskytter mot skadelige data og sikrer dataintegritet
 */

// Risk Categories
export const RiskCategorySchema = z.enum([
  "SAFETY",
  "ENVIRONMENT",
  "QUALITY",
  "SECURITY",
  "WORK_ENVIRONMENT",
  "CHEMICAL",
  "FIRE",
  "ERGONOMIC",
  "PSYCHOSOCIAL",
  "BIOLOGICAL",
  "PHYSICAL",
  "OTHER",
]);

// Risk Status
export const RiskStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "MITIGATED",
  "ACCEPTED",
  "CLOSED",
]);

// Exposure levels for chemicals
export const ExposureLevelSchema = z.enum([
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
]);

/**
 * Validering for oppretting av ny risiko
 */
export const CreateRiskSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200, "Tittel kan ikke være mer enn 200 tegn"),
  context: z.string().max(5000, "Kontekst kan ikke være mer enn 5000 tegn").optional(),
  category: RiskCategorySchema,
  likelihood: z.number().int().min(1).max(5),
  consequence: z.number().int().min(1).max(5),
  score: z.number().int().min(1).max(25),
  chemicalId: z.string().cuid().optional(),
  exposure: ExposureLevelSchema.optional(),
  suggestedControls: z.array(z.string().max(500)).max(20).optional(),
  trainingRequired: z.array(z.string().max(100)).max(10).optional(),
});

/**
 * Validering for oppdatering av eksisterende risiko
 */
export const UpdateRiskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  context: z.string().max(5000).optional(),
  category: RiskCategorySchema.optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  consequence: z.number().int().min(1).max(5).optional(),
  score: z.number().int().min(1).max(25).optional(),
  status: RiskStatusSchema.optional(),
  ownerId: z.string().cuid().optional(),
});

/**
 * Validering for oppretting av risikotiltak
 */
export const CreateRiskControlSchema = z.object({
  riskId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  controlType: z.enum([
    "ELIMINATION",
    "SUBSTITUTION",
    "ENGINEERING",
    "ADMINISTRATIVE",
    "PPE",
  ]),
  implementationDate: z.string().datetime().optional(),
  responsibleId: z.string().cuid().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"]).optional(),
});

/**
 * Validering for oppretting av kjemikalie
 */
export const CreateChemicalSchema = z.object({
  productName: z.string().min(1, "Produktnavn er påkrevd").max(200),
  supplier: z.string().max(200).optional(),
  casNumber: z.string().max(50).optional(),
  gtin: z.string().max(18).optional(),
  supplierProductCode: z.string().max(80).optional(),
  hazardStatements: z.string().max(1000).optional(),
  warningPictograms: z.string().max(1000).optional(),
  requiredPPE: z.string().max(1000).optional(),
  sdsKey: z.string().max(500).optional(),
  containsIsocyanates: z.boolean().optional(),
  isocyanateDetails: z.string().max(500).optional(),
});

/**
 * Validering for oppretting av tiltak
 */
export const CreateMeasureSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueAt: z.string().datetime().optional(),
  responsibleId: z.string().cuid(),
  riskId: z.string().cuid().optional(),
  incidentId: z.string().cuid().optional(),
  auditId: z.string().cuid().optional(),
});

/**
 * Validering for oppretting av hendelse/avvik
 */
export const CreateIncidentSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  description: z.string().min(1, "Beskrivelse er påkrevd").max(5000),
  category: z.enum([
    "ACCIDENT",
    "NEAR_MISS",
    "ENVIRONMENTAL",
    "FIRE",
    "CHEMICAL_SPILL",
    "EQUIPMENT_FAILURE",
    "SECURITY_BREACH",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  location: z.string().max(200).optional(),
  occurredAt: z.string().datetime(),
  reportedById: z.string().cuid(),
});

/**
 * Validering for oppretting av revisjon
 */
export const CreateAuditSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  description: z.string().max(2000).optional(),
  auditType: z.enum([
    "INTERNAL",
    "EXTERNAL",
    "CERTIFICATION",
    "SUPPLIER",
    "REGULATORY",
  ]),
  standard: z.string().max(100).optional(),
  scheduledDate: z.string().datetime(),
  auditorId: z.string().cuid(),
  scope: z.string().max(1000).optional(),
});

/**
 * Validering for oppretting av dokument
 */
export const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  description: z.string().max(2000).optional(),
  category: z.enum([
    "POLICY",
    "PROCEDURE",
    "INSTRUCTION",
    "FORM",
    "REPORT",
    "CERTIFICATE",
    "OTHER",
  ]),
  fileKey: z.string().max(500),
  fileName: z.string().max(200),
  fileSize: z.number().int().positive(),
  mimeType: z.string().max(100),
  ownerId: z.string().cuid(),
});

/**
 * Validering for generell ID parameter
 */
export const IdParamSchema = z.object({
  id: z.string().cuid("Ugyldig ID format"),
});

/**
 * Validering for paginering
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Validering for søk
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
});

// Type exports
export type CreateRiskInput = z.infer<typeof CreateRiskSchema>;
export type UpdateRiskInput = z.infer<typeof UpdateRiskSchema>;
export type CreateRiskControlInput = z.infer<typeof CreateRiskControlSchema>;
export type CreateChemicalInput = z.infer<typeof CreateChemicalSchema>;
export type CreateMeasureInput = z.infer<typeof CreateMeasureSchema>;
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type CreateAuditInput = z.infer<typeof CreateAuditSchema>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
