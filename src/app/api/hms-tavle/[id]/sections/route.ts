import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { HmsTavleSectionType, TavleDisplayMode } from "@prisma/client";
import { getPlanLimits, isSectionAllowed } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { emitTavleUpdate } from "@/lib/tavle-events";

const sectionsSchema = z.object({
  sections: z.array(
    z.object({
      type: z.nativeEnum(HmsTavleSectionType),
      title: z.string().optional().nullable(),
      order: z.number().int(),
      isVisible: z.boolean(),
      displayMode: z.nativeEnum(TavleDisplayMode).optional().default("KARUSELL"),
      config: z.record(z.string(), z.any()).optional().default({}),
    })
  ),
});

export async function PUT(
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
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });
    if (!subscription) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen abonnement", 403);

    const body = await req.json();
    const parsed = sectionsSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const limits = getPlanLimits(subscription.plan);
    for (const s of parsed.data.sections) {
      if (!isSectionAllowed(subscription.plan, s.type)) {
        return createErrorResponse(ErrorCodes.FORBIDDEN, `Seksjonstype "${s.type}" krever høyere plan`, 400);
      }
    }

    if (parsed.data.sections.length > limits.maxSections) {
      return createErrorResponse(ErrorCodes.CONFLICT, `Maks ${limits.maxSections} seksjoner på din plan`, 400);
    }

    await prisma.$transaction([
      prisma.hmsTavleSection.deleteMany({ where: { tavleId: id } }),
      prisma.hmsTavleSection.createMany({
        data: parsed.data.sections.map((s) => ({
          tavleId: id,
          type: s.type,
          title: s.title ?? null,
          order: s.order,
          isVisible: s.isVisible,
          displayMode: s.displayMode ?? "KARUSELL",
          config: (s.config ?? {}) as any,
        })),
      }),
    ]);

    emitTavleUpdate(tavle.publicToken);

    return createSuccessResponse({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
