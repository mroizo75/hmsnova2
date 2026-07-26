import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const existing = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (existing) return createErrorResponse(ErrorCodes.ALREADY_EXISTS, "HMS Tavle-abonnement finnes allerede", 400);

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const subscription = await prisma.hmsTavleSubscription.create({
      data: {
        tenantId: session.user.tenantId,
        plan: "ADDON",
        status: "ACTIVE",
        isAddon: true,
        pricePerMonth: 290,
        startsAt: new Date(),
        endsAt: oneYearFromNow,
        autoRenew: true,
        maxTavler: 999,
      },
    });

    return createSuccessResponse(subscription, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
