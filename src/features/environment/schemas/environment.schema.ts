import { z } from "zod";
import {
  ControlFrequency,
  EnvironmentalAspectCategory,
  EnvironmentalAspectStatus,
  EnvironmentalImpactType,
} from "@prisma/client";

const iso14001AspectFields = {
  lifecycleStages: z.array(z.enum(["DESIGN", "PROCUREMENT", "PRODUCTION", "USE", "END_OF_LIFE"])).optional(),
  contextClimate: z.boolean().optional(),
  contextBiodiversity: z.boolean().optional(),
  contextResources: z.boolean().optional(),
  contextPollution: z.boolean().optional(),
};

export const createEnvironmentalAspectSchema = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  description: z.string().optional().or(z.literal("")).nullable(),
  process: z.string().optional().or(z.literal("")).nullable(),
  location: z.string().optional().or(z.literal("")).nullable(),
  category: z.nativeEnum(EnvironmentalAspectCategory),
  impactType: z.nativeEnum(EnvironmentalImpactType),
  severity: z.number().int().min(1).max(5),
  likelihood: z.number().int().min(1).max(5),
  legalRequirement: z.string().optional().or(z.literal("")).nullable(),
  controlMeasures: z.string().optional().or(z.literal("")).nullable(),
  monitoringMethod: z.string().optional().or(z.literal("")).nullable(),
  monitoringFrequency: z.nativeEnum(ControlFrequency).optional(),
  ownerId: z.string().cuid().optional().nullable(),
  goalId: z.string().cuid().optional().nullable(),
  status: z.nativeEnum(EnvironmentalAspectStatus).optional(),
  nextReviewDate: z.date().optional().nullable(),
  ...iso14001AspectFields,
});

export const updateEnvironmentalAspectSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  process: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  category: z.nativeEnum(EnvironmentalAspectCategory).optional(),
  impactType: z.nativeEnum(EnvironmentalImpactType).optional(),
  severity: z.number().int().min(1).max(5).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  legalRequirement: z.string().optional().nullable(),
  controlMeasures: z.string().optional().nullable(),
  monitoringMethod: z.string().optional().nullable(),
  monitoringFrequency: z.nativeEnum(ControlFrequency).optional(),
  ownerId: z.string().cuid().optional().nullable(),
  goalId: z.string().cuid().optional().nullable(),
  status: z.nativeEnum(EnvironmentalAspectStatus).optional(),
  nextReviewDate: z.date().optional().nullable(),
  ...iso14001AspectFields,
});

export const createEnvironmentalMeasurementSchema = z.object({
  tenantId: z.string().cuid(),
  aspectId: z.string().cuid(),
  parameter: z.string().min(2, "Parameter må være minst 2 tegn"),
  unit: z.string().optional().or(z.literal("")).nullable(),
  method: z.string().optional().or(z.literal("")).nullable(),
  limitValue: z.number().optional().nullable(),
  targetValue: z.number().optional().nullable(),
  measuredValue: z.number(),
  measurementDate: z.date(),
  notes: z.string().optional().nullable(),
  responsibleId: z.string().cuid().optional().nullable(),
});

export type CreateEnvironmentalAspectInput = z.infer<typeof createEnvironmentalAspectSchema>;
export type UpdateEnvironmentalAspectInput = z.infer<typeof updateEnvironmentalAspectSchema>;
export type CreateEnvironmentalMeasurementInput = z.infer<typeof createEnvironmentalMeasurementSchema>;
