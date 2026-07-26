import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const logSchema = z.object({
  unitName: z.string().min(1).max(100),
  unitType: z.enum(["KJOLEROM", "FRYSER", "VARMHOLDING", "ANNET"]),
  temperature: z.number(),
  measuredAt: z.string().datetime(),
  measuredBy: z.string().max(100).optional().nullable(),
  deviationNote: z.string().max(1000).optional().nullable(),
});

const MIN_TEMP: Record<string, number> = { KJOLEROM: -2, FRYSER: -40, VARMHOLDING: 60, ANNET: -40 };
const MAX_TEMP: Record<string, number> = { KJOLEROM: 8, FRYSER: -15, VARMHOLDING: 100, ANNET: 100 };

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const url = new URL(req.url);
    const unitName = url.searchParams.get("unitName");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);

    const logs = await prisma.temperaturLog.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(unitName ? { unitName } : {}),
      },
      orderBy: { measuredAt: "desc" },
      take: limit,
    });

    return createSuccessResponse({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const body = await req.json();
    const parsed = logSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const { unitType, temperature } = parsed.data;
    const isDeviation = temperature < MIN_TEMP[unitType] || temperature > MAX_TEMP[unitType];

    const log = await prisma.temperaturLog.create({
      data: {
        tenantId: session.user.tenantId,
        unitName: parsed.data.unitName,
        unitType: parsed.data.unitType,
        temperature,
        measuredAt: new Date(parsed.data.measuredAt),
        measuredBy: parsed.data.measuredBy ?? null,
        isDeviation,
        deviationNote: parsed.data.deviationNote ?? null,
      },
    });

    return createSuccessResponse({ log }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
