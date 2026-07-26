import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["SKADE_PA_GJEST", "SAVNET_GJEST", "MEDISINSK_NODSITUASJON", "BRANN", "MATFORGIFTNING", "ANNET"]),
  description: z.string().min(5).max(5000),
  location: z.string().max(200).optional().nullable(),
  guestName: z.string().max(100).optional().nullable(),
  guestContact: z.string().max(200).optional().nullable(),
  injurySeverity: z.enum(["INGEN", "LETT", "ALVORLIG", "LIVSTRUENDE"]).optional().nullable(),
  actionsTaken: z.string().max(3000).optional().nullable(),
  notifiedPolice: z.boolean().optional().default(false),
  notifiedAmbulance: z.boolean().optional().default(false),
  notifiedParents: z.boolean().optional().default(false),
  reportedToMattilsynet: z.boolean().optional().default(false),
  occurredAt: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const hendelser = await prisma.gjesteHendelse.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { occurredAt: "desc" },
    });

    return createSuccessResponse({ hendelser });
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

    const hendelse = await prisma.gjesteHendelse.create({
      data: {
        tenantId: session.user.tenantId,
        type: parsed.data.type,
        description: parsed.data.description,
        location: parsed.data.location ?? null,
        guestName: parsed.data.guestName ?? null,
        guestContact: parsed.data.guestContact ?? null,
        injurySeverity: parsed.data.injurySeverity ?? null,
        actionsTaken: parsed.data.actionsTaken ?? null,
        notifiedPolice: parsed.data.notifiedPolice ?? false,
        notifiedAmbulance: parsed.data.notifiedAmbulance ?? false,
        notifiedParents: parsed.data.notifiedParents ?? false,
        reportedToMattilsynet: parsed.data.reportedToMattilsynet ?? false,
        occurredAt: new Date(parsed.data.occurredAt),
      },
    });

    return createSuccessResponse({ hendelse }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
