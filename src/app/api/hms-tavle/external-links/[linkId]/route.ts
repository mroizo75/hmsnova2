import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { linkId } = await params;
    const link = await prisma.hmsTavleExternalLink.findFirst({
      where: { id: linkId },
      include: { tavle: { select: { tenantId: true } } },
    });

    if (!link || link.tavle.tenantId !== session.user.tenantId) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Lenke ikke funnet", 404);
    }

    await prisma.hmsTavleExternalLink.delete({ where: { id: linkId } });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
