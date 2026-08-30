import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  bevillingsnummer: z.string().max(100).optional().nullable(),
  kommune: z.string().max(100).optional().nullable(),
  gyldigFra: z.string().datetime().optional().nullable(),
  gyldigTil: z.string().datetime().optional().nullable(),
  styrer: z.string().max(200).optional().nullable(),
  stedfortreder: z.string().max(200).optional().nullable(),
  skjenketider: z.string().max(4000).optional().nullable(),
  internregler: z.string().max(8000).optional().nullable(),
  sistGjennomgatt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const bevilling = await prisma.skjenkeBevilling.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { updatedAt: "desc" },
    });
    return createSuccessResponse({ bevilling });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const existing = await prisma.skjenkeBevilling.findFirst({
      where: { tenantId: session.user.tenantId },
    });

    const data = {
      bevillingsnummer: parsed.data.bevillingsnummer ?? null,
      kommune: parsed.data.kommune ?? null,
      gyldigFra: parsed.data.gyldigFra ? new Date(parsed.data.gyldigFra) : null,
      gyldigTil: parsed.data.gyldigTil ? new Date(parsed.data.gyldigTil) : null,
      styrer: parsed.data.styrer ?? null,
      stedfortreder: parsed.data.stedfortreder ?? null,
      skjenketider: parsed.data.skjenketider ?? null,
      internregler: parsed.data.internregler ?? null,
      sistGjennomgatt: parsed.data.sistGjennomgatt ? new Date(parsed.data.sistGjennomgatt) : null,
    };

    const bevilling = existing
      ? await prisma.skjenkeBevilling.update({ where: { id: existing.id }, data })
      : await prisma.skjenkeBevilling.create({
          data: { tenantId: session.user.tenantId, ...data },
        });

    return createSuccessResponse({ bevilling });
  } catch (error) {
    return handleApiError(error);
  }
}
