import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ portalToken: string }> }
) {
  try {
    const { portalToken } = await params;
    const portal = await prisma.subcontractorPortal.findUnique({
      where: { portalToken },
      include: {
        tavle: {
          select: {
            name: true,
            isPublic: true,
            tenant: { select: { name: true } },
            project: { select: { name: true, location: true } },
          },
        },
      },
    });

    if (!portal) return createErrorResponse(ErrorCodes.NOT_FOUND, "Portal ikke funnet", 404);
    if (!portal.tavle.isPublic) return createErrorResponse(ErrorCodes.FORBIDDEN, "Tavle er ikke tilgjengelig", 403);

    const subscription = await prisma.hmsTavleSubscription.findFirst({
      where: { tenant: { hmsTavler: { some: { subcontractorPortal: { portalToken } } } } },
    });

    if (!subscription || subscription.status === "EXPIRED") {
      return createErrorResponse("SUBSCRIPTION_EXPIRED", "Abonnementet er utløpt", 402);
    }

    return createSuccessResponse({
      portal: {
        allowAvvik: portal.allowAvvik,
        allowRuh: portal.allowRuh,
        allowSja: portal.allowSja,
        allowPdfUpload: portal.allowPdfUpload,
        requireEmail: portal.requireEmail,
      },
      tavle: {
        name: portal.tavle.name,
        tenantName: portal.tavle.tenant.name,
        projectName: portal.tavle.project?.name,
        location: portal.tavle.project?.location,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
