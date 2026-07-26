import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

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

    return createSuccessResponse({ tavle, checkins, plan: subscription.plan });
  } catch (error) {
    return handleApiError(error);
  }
}
