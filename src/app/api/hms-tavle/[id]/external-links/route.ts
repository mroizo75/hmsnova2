import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { ExternalLinkType } from "@prisma/client";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { emitTavleUpdate } from "@/lib/tavle-events";

const addSchema = z.object({
  title: z.string().min(1),
  url: z.string().url("Ugyldig URL"),
  type: z.nativeEnum(ExternalLinkType),
  icon: z.string().optional(),
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

    const { id } = await params;
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: { _count: { select: { externalLinks: true } } },
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const sub = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });
    if (!sub) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen abonnement", 403);

    const limits = getPlanLimits(sub.plan);
    if (tavle._count.externalLinks >= limits.maxExternalLinks) {
      return createErrorResponse(ErrorCodes.CONFLICT, `Maks ${limits.maxExternalLinks} lenker på din plan`, 400);
    }

    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const link = await prisma.hmsTavleExternalLink.create({
      data: { tavleId: id, ...parsed.data },
    });

    emitTavleUpdate(tavle.publicToken);

    return createSuccessResponse(link, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
