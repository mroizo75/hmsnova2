import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { skjenkeHendelsePatchSchema } from "@/features/skjenking/schemas/skjenking.schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role, session.user.extraRoles);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { id } = await params;
    const parsed = skjenkeHendelsePatchSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const existing = await prisma.skjenkeHendelse.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!existing) return createErrorResponse(ErrorCodes.NOT_FOUND, "Hendelsen finnes ikke", 404);

    if (parsed.data.status === "LUKKET" && existing.type === "AVVIK" && !parsed.data.korrigerendeTiltak?.trim()) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Et lukket avvik må ha korrigerende tiltak.", 400);
    }

    const item = await prisma.skjenkeHendelse.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        korrigerendeTiltak: parsed.data.korrigerendeTiltak ?? existing.korrigerendeTiltak,
        forebygging: parsed.data.forebygging ?? existing.forebygging,
        note: parsed.data.note ?? existing.note,
        lukketAt: parsed.data.status === "LUKKET" ? existing.lukketAt ?? new Date() : null,
      },
    });
    return createSuccessResponse({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
