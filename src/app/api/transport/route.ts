import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  vehicleReg: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  routeDesc: z.string().max(500).optional().nullable(),
  kmStart: z.number().optional().nullable(),
  kmEnd: z.number().optional().nullable(),
  drivingHours: z.number().optional().nullable(),
  breakHours: z.number().optional().nullable(),
  preCheckDone: z.boolean().optional().default(false),
  preCheckNote: z.string().max(1000).optional().nullable(),
  incidents: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const url = new URL(req.url);
    const vehicleReg = url.searchParams.get("vehicleReg");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);

    const journaler = await prisma.transportJournal.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(vehicleReg ? { vehicleReg } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return createSuccessResponse({ journaler });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const journal = await prisma.transportJournal.create({
      data: {
        tenantId: session.user.tenantId,
        vehicleReg: parsed.data.vehicleReg,
        driverName: parsed.data.driverName,
        date: parsed.data.date,
        departureTime: parsed.data.departureTime,
        arrivalTime: parsed.data.arrivalTime ?? null,
        routeDesc: parsed.data.routeDesc ?? null,
        kmStart: parsed.data.kmStart ?? null,
        kmEnd: parsed.data.kmEnd ?? null,
        drivingHours: parsed.data.drivingHours ?? null,
        breakHours: parsed.data.breakHours ?? null,
        preCheckDone: parsed.data.preCheckDone,
        preCheckNote: parsed.data.preCheckNote ?? null,
        incidents: parsed.data.incidents ?? null,
      },
    });

    return createSuccessResponse({ journal }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
