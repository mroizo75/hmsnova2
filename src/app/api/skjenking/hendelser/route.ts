import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  occurredAt: z.string().datetime(),
  type: z.enum(["ALDERSKONTROLL", "BERUSELSE", "BORTVISNING", "AVVIK", "ANNET"]),
  action: z.enum(["AVSLATT", "SERVERING_STOPPET", "BORTVIST", "ADVARSEL", "ANNET"]),
  beruselsesgrad: z.enum(["NORMAL", "PA_VEI", "APENBART_PAVIRKET"]).optional().nullable(),
  registeredBy: z.string().max(100).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const items = await prisma.skjenkeHendelse.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
    return createSuccessResponse({ items });
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

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const item = await prisma.skjenkeHendelse.create({
      data: {
        tenantId: session.user.tenantId,
        occurredAt: new Date(parsed.data.occurredAt),
        type: parsed.data.type,
        action: parsed.data.action,
        beruselsesgrad: parsed.data.beruselsesgrad ?? null,
        registeredBy: parsed.data.registeredBy ?? null,
        note: parsed.data.note ?? null,
      },
    });
    return createSuccessResponse({ item }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
