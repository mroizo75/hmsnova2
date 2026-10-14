import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { skjenkeGjennomgangSchema } from "@/features/skjenking/schemas/skjenking.schema";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const items = await prisma.skjenkeGjennomgang.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { gjennomfortAt: "desc" },
      take: 20,
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

    const perms = getPermissions(session.user.role, session.user.extraRoles);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const parsed = skjenkeGjennomgangSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const gjennomfortAt = new Date(parsed.data.gjennomfortAt);
    const nesteDato = new Date(parsed.data.nesteDato);
    const tenantId = session.user.tenantId;

    const item = await prisma.skjenkeGjennomgang.create({
      data: {
        tenantId,
        gjennomfortAt,
        gjennomfortAv: parsed.data.gjennomfortAv,
        funn: parsed.data.funn,
        tiltak: parsed.data.tiltak ?? null,
        nesteDato,
      },
    });

    const existing = await prisma.skjenkeBevilling.findFirst({ where: { tenantId } });
    if (existing) {
      await prisma.skjenkeBevilling.update({
        where: { id: existing.id },
        data: { sistGjennomgatt: gjennomfortAt, nesteGjennomgang: nesteDato },
      });
    } else {
      await prisma.skjenkeBevilling.create({
        data: { tenantId, sistGjennomgatt: gjennomfortAt, nesteGjennomgang: nesteDato },
      });
    }

    return createSuccessResponse({ item }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
