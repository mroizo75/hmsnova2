import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { getGuestServiceStats } from "@/features/hms-tavle/lib/gjesteservice-stats";
import { getTavleLiveData } from "@/features/hms-tavle/lib/tavle-live-data";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tavle = await prisma.hmsTavle.findUnique({
      where: { publicToken: token },
      include: {
        sections: { where: { isVisible: true }, orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: {
          select: {
            portalToken: true,
            allowAvvik: true,
            allowRuh: true,
            allowSja: true,
            allowPdfUpload: true,
          },
        },
        tenant: { select: { name: true, isTavleOnly: true } },
        project: {
          select: {
            name: true,
            location: true,
            constructionShaPlan: { select: { status: true, availableOnSite: true, updatedAt: true } },
            constructionPreNotification: { select: { status: true, sentAt: true } },
          },
        },
      },
    });

    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);
    if (!tavle.isPublic) return createErrorResponse(ErrorCodes.FORBIDDEN, "Tavle er ikke offentlig tilgjengelig", 403);

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: tavle.tenantId },
    });

    if (!subscription || subscription.status === "EXPIRED") {
      return createErrorResponse("SUBSCRIPTION_EXPIRED", "Tavle-abonnementet er utløpt", 402);
    }

    const today = new Date().toISOString().slice(0, 10);
    const checkins =
      subscription.plan !== "ENKEL"
        ? await prisma.tavleCheckin.findMany({
            where: { tavleId: tavle.id, date: today },
            orderBy: { checkedInAt: "asc" },
            select: { id: true, name: true, employer: true, checkedInAt: true, checkedOutAt: true },
          })
        : [];

    // Tillitspanel: kun aggregerte tall, aldri rader med saksinnhold
    const harTillitspanel = tavle.sections.some((s) => s.type === "GJESTESERVICE_STATUS");
    const guestStats = harTillitspanel ? await getGuestServiceStats(tavle.id) : null;

    // Live HMS Nova-data er forbeholdt planer med full integrasjon
    const liveData =
      getPlanLimits(subscription.plan).hasLiveHmsNovaData
        ? await getTavleLiveData({
            tenantId: tavle.tenantId,
            projectId: tavle.projectId,
            sectionTypes: tavle.sections.map((s) => s.type),
          })
        : null;

    return createSuccessResponse({
      tavle,
      checkins,
      plan: subscription.plan,
      guestStats,
      liveData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
