import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  planName: z.string().min(2).max(200),
  buildingName: z.string().max(200).optional().nullable(),
  totalFloors: z.number().int().min(1).optional().default(1),
  maxOccupancy: z.number().int().optional().nullable(),
  assemblyPoint: z.string().max(200).optional().nullable(),
  fireWarden: z.string().max(100).optional().nullable(),
  floors: z.array(z.object({
    floorNr: z.number().int(),
    responsible: z.string().max(100).optional().nullable(),
    roomCount: z.number().int().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })).optional().default([]),
  emergencyContacts: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(100).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
  })).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const planer = await prisma.hotellEvakueringsplan.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    return createSuccessResponse({ planer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const plan = await prisma.hotellEvakueringsplan.create({
      data: {
        tenantId: session.user.tenantId,
        planName: parsed.data.planName,
        buildingName: parsed.data.buildingName ?? null,
        totalFloors: parsed.data.totalFloors,
        maxOccupancy: parsed.data.maxOccupancy ?? null,
        assemblyPoint: parsed.data.assemblyPoint ?? null,
        fireWarden: parsed.data.fireWarden ?? null,
        floors: parsed.data.floors as any,
        emergencyContacts: parsed.data.emergencyContacts as any,
      },
    });

    return createSuccessResponse({ plan }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
