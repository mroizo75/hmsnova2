import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { SKJENKE_RUTINE_MALER } from "@/features/skjenking/lib/internkontroll";
import { skjenkeRutineSchema } from "@/features/skjenking/schemas/skjenking.schema";
import { ensureSkjenkingRutiner } from "@/server/skjenking-rutiner";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    await ensureSkjenkingRutiner(session.user.tenantId);
    const items = await prisma.skjenkeRutine.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { tittel: "asc" },
    });
    return createSuccessResponse({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role, session.user.extraRoles);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const parsed = skjenkeRutineSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const mal = SKJENKE_RUTINE_MALER.find((row) => row.nokkel === parsed.data.nokkel);
    if (!mal) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ukjent rutine", 400);

    const item = await prisma.skjenkeRutine.upsert({
      where: { tenantId_nokkel: { tenantId: session.user.tenantId, nokkel: mal.nokkel } },
      update: { innhold: parsed.data.innhold, aktiv: parsed.data.aktiv, tittel: mal.tittel, lovhjemmel: mal.lovhjemmel },
      create: {
        tenantId: session.user.tenantId,
        nokkel: mal.nokkel,
        tittel: mal.tittel,
        lovhjemmel: mal.lovhjemmel,
        innhold: parsed.data.innhold,
        aktiv: parsed.data.aktiv,
      },
    });
    return createSuccessResponse({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
