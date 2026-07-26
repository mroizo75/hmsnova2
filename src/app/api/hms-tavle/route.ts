import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { getBransjeSeedSections } from "@/features/hms-tavle/lib/bransje-seed";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2, "Navn må ha minst 2 tegn"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  brandColor: z.string().optional(),
  bransje: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canViewHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const [tavler, subscription] = await Promise.all([
      prisma.hmsTavle.findMany({
        where: { tenantId: session.user.tenantId },
        include: {
          sections: { orderBy: { order: "asc" } },
          externalLinks: { orderBy: { order: "asc" } },
          subcontractorPortal: { select: { id: true, portalToken: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { checkins: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.hmsTavleSubscription.findUnique({
        where: { tenantId: session.user.tenantId },
      }),
    ]);

    return createSuccessResponse({ tavler, subscription });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (!subscription || subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
      return createErrorResponse("NO_SUBSCRIPTION", "Ingen aktiv HMS Tavle-abonnement", 402);
    }

    const { getPlanLimits } = await import("@/features/hms-tavle/lib/tavle-plan-limits");
    const limits = getPlanLimits(subscription.plan);
    const existing = await prisma.hmsTavle.count({ where: { tenantId: session.user.tenantId } });
    if (existing >= limits.maxTavler) {
      return createErrorResponse(ErrorCodes.CONFLICT, `Maks ${limits.maxTavler} tavle(r) på din plan`, 400);
    }

    const bransje = parsed.data.bransje ?? "BYGG_ANLEGG";
    const seedSections = getBransjeSeedSections(bransje, subscription.plan);

    const opprettet = await prisma.hmsTavle.create({
      data: {
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        description: parsed.data.description,
        projectId: parsed.data.projectId,
        brandColor: parsed.data.brandColor,
        bransje,
      },
    });

    if (seedSections.length > 0) {
      await prisma.hmsTavleSection.createMany({
        data: seedSections.map((section) => ({
          tavleId: opprettet.id,
          type: section.type,
          title: section.title,
          order: section.order,
          isVisible: section.isVisible,
          displayMode: section.displayMode,
          config: section.config as Prisma.InputJsonValue,
        })),
      });
    }

    const tavle = await prisma.hmsTavle.findUniqueOrThrow({
      where: { id: opprettet.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    return createSuccessResponse(tavle, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
