import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["AAPEN", "UNDER_BEHANDLING", "LUKKET"]).optional(),
  actionsTaken: z.string().max(3000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateIncidents) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { id } = await params;
    const hendelse = await prisma.gjesteHendelse.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!hendelse) return createErrorResponse(ErrorCodes.NOT_FOUND, "Hendelse ikke funnet", 404);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const updated = await prisma.gjesteHendelse.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.actionsTaken !== undefined ? { actionsTaken: parsed.data.actionsTaken } : {}),
        ...(parsed.data.status === "LUKKET" ? { closedAt: new Date(), closedBy: session.user.name ?? session.user.email ?? "Ukjent" } : {}),
      },
    });

    return createSuccessResponse({ hendelse: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
