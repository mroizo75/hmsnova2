import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

/**
 * POST /api/superadmin/hms-tavle/[id]/upgrade-to-hmsnova
 *
 * Oppgraderer en standalone HMS Tavle-kunde til full HMS Nova-abonnent:
 *  1. Setter Tenant.isTavleOnly = false  → kunden får tilgang til hele HMS Nova
 *  2. Oppdaterer HmsTavleSubscription.plan = ADDON, isAddon = true
 *     → tavlen konverteres til tilleggsmodul (kr 290/mnd)
 *  3. Oppretter en HMS Nova Subscription om den ikke finnes fra før
 *     (type STANDARD med 12 måneder som startpunkt)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Kun superadmin", 403);
    }

    const { id } = await params;

    const tavleSub = await prisma.hmsTavleSubscription.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true, name: true, isTavleOnly: true,
            subscription: { select: { id: true } },
          },
        },
      },
    });

    if (!tavleSub) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Abonnement ikke funnet", 404);
    }

    if (!tavleSub.tenant.isTavleOnly) {
      return createErrorResponse(ErrorCodes.CONFLICT, "Kunden er allerede en full HMS Nova-bruker", 400);
    }

    const tenantId = tavleSub.tenantId;
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    await prisma.$transaction(async (tx) => {
      // 1. Fjern standalone-flagget
      await tx.tenant.update({
        where: { id: tenantId },
        data: { isTavleOnly: false },
      });

      // 2. Konverter HMS Tavle-abonnement til add-on
      await tx.hmsTavleSubscription.update({
        where: { id },
        data: {
          plan: "ADDON",
          isAddon: true,
          pricePerMonth: 290,
        },
      });

      // 3. Opprett HMS Nova-abonnement om det ikke finnes
      if (!tavleSub.tenant.subscription) {
        await tx.subscription.create({
          data: {
            tenantId,
            plan: "STARTER",
            status: "ACTIVE",
            price: 990,
            billingInterval: "MONTHLY",
            currentPeriodStart: now,
            currentPeriodEnd: oneYearLater,
          },
        });
      }
    });

    return createSuccessResponse({
      upgraded: true,
      tenantName: tavleSub.tenant.name,
      message: `${tavleSub.tenant.name} er nå en full HMS Nova-bruker. Tavlen er konvertert til Add-on (kr 290/mnd).`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
