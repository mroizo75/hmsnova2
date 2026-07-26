import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";

const portalSchema = z.object({
  allowAvvik: z.boolean(),
  allowRuh: z.boolean(),
  allowSja: z.boolean(),
  allowPdfUpload: z.boolean(),
  requireEmail: z.boolean(),
  autoApprove: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const sub = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });
    if (!sub) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen abonnement", 403);

    const limits = getPlanLimits(sub.plan);
    if (!limits.hasUePortal) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "UE-portalen krever Standard-plan eller høyere", 403);
    }

    const { id } = await params;
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const body = await req.json();
    const parsed = portalSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const portal = await prisma.subcontractorPortal.upsert({
      where: { tavleId: id },
      update: parsed.data,
      create: { tavleId: id, ...parsed.data },
    });

    return createSuccessResponse(portal);
  } catch (error) {
    return handleApiError(error);
  }
}
