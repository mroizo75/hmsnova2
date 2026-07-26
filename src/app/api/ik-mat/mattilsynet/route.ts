import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  inspectedAt: z.string().datetime(),
  inspector: z.string().max(100).optional().nullable(),
  smilejesKarakter: z.enum(["STRAALENDE", "GODT", "NOYTRAL", "TRIST"]).optional().nullable(),
  findings: z.string().max(3000).optional().nullable(),
  followUpDeadline: z.string().datetime().optional().nullable(),
  followUpNote: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const inspeksjoner = await prisma.mattilsynetInspeksjon.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { inspectedAt: "desc" },
    });

    return createSuccessResponse({ inspeksjoner });
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

    const inspeksjon = await prisma.mattilsynetInspeksjon.create({
      data: {
        tenantId: session.user.tenantId,
        inspectedAt: new Date(parsed.data.inspectedAt),
        inspector: parsed.data.inspector ?? null,
        smilejesKarakter: parsed.data.smilejesKarakter ?? null,
        findings: parsed.data.findings ?? null,
        followUpDeadline: parsed.data.followUpDeadline ? new Date(parsed.data.followUpDeadline) : null,
        followUpNote: parsed.data.followUpNote ?? null,
      },
    });

    return createSuccessResponse({ inspeksjon }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
