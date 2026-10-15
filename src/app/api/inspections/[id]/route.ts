import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";
import { notifyTaskAssigned } from "@/lib/task-assignment-notice";

/**
 * GET /api/inspections/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let sessionTenantId = "";
    try {
      const tenantContext = await getRequiredTenantContext();
      sessionTenantId = tenantContext.tenantId;
    } catch {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const { id } = await params;

    const inspection = await prisma.inspection.findFirst({
      where: { id, tenantId: sessionTenantId },
      include: {
        findings: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!inspection) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Inspeksjon ikke funnet", 404);
    }

    return createSuccessResponse({ inspection });
  } catch (error) {
    console.error("[Inspection GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente inspeksjon", 500);
  }
}

/**
 * PATCH /api/inspections/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantContext = await getRequiredTenantContext().catch(() => null);
    if (!tenantContext) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const sessionTenantId = tenantContext.tenantId;
    const { id } = await params;
    const data = await request.json();
    const existing = await prisma.inspection.findFirst({
      where: { id, tenantId: sessionTenantId },
      select: { id: true, title: true, conductedBy: true, scheduledDate: true },
    });
    if (!existing) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Inspeksjon ikke funnet", 404);
    }

    let conductedBy: string | undefined;
    if (typeof data.conductedBy === "string" && data.conductedBy.trim().length > 0) {
      const member = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: data.conductedBy.trim(),
            tenantId: sessionTenantId,
          },
        },
        select: { userId: true },
      });
      if (!member) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Ansvarlig bruker finnes ikke i virksomheten",
          400
        );
      }
      conductedBy = member.userId;
    }

    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : existing.scheduledDate;

    const inspection = await prisma.inspection.update({
      where: { id: existing.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.status && { status: data.status }),
        ...(data.scheduledDate && { scheduledDate }),
        ...(data.completedDate && { completedDate: new Date(data.completedDate) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(conductedBy && { conductedBy }),
        ...(data.participants !== undefined && {
          participants: data.participants ? JSON.stringify(data.participants) : null,
        }),
        ...(data.checklist !== undefined && {
          checklist: data.checklist as Prisma.InputJsonValue,
        }),
      },
      include: {
        findings: true,
      },
    });

    if (conductedBy && conductedBy !== existing.conductedBy) {
      const when = scheduledDate.toLocaleDateString("nb-NO");
      await notifyTaskAssigned({
        tenantId: sessionTenantId,
        assigneeId: conductedBy,
        actorId: tenantContext.userId,
        type: "INSPECTION_SCHEDULED",
        title: "Du har fått en vernerunde",
        message: `«${inspection.title}» er tildelt deg og skal gjennomføres ${when}.`,
        link: `/dashboard/inspections/${inspection.id}`,
      });
    }

    return createSuccessResponse({ inspection }, "Inspeksjon oppdatert");
  } catch (error) {
    console.error("[Inspection PATCH] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke oppdatere inspeksjon", 500);
  }
}

/**
 * DELETE /api/inspections/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let sessionTenantId = "";
    try {
      const tenantContext = await getRequiredTenantContext();
      sessionTenantId = tenantContext.tenantId;
    } catch {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const { id } = await params;
    const existing = await prisma.inspection.findFirst({
      where: { id, tenantId: sessionTenantId },
      select: { id: true },
    });
    if (!existing) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Inspeksjon ikke funnet", 404);
    }

    await prisma.inspection.delete({
      where: { id: existing.id },
    });

    return createSuccessResponse(undefined, "Inspeksjon slettet");
  } catch (error) {
    console.error("[Inspection DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette inspeksjon", 500);
  }
}

