import { NextRequest, NextResponse } from "next/server";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/audits/[id]
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

    const audit = await prisma.audit.findFirst({
      where: { id, tenantId: sessionTenantId },
      include: {
        findings: {
          orderBy: { createdAt: "desc" },
        },
        measures: true,
      },
    });

    if (!audit) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Revisjon ikke funnet", 404);
    }

    return createSuccessResponse({ audit });
  } catch (error) {
    console.error("[Audit GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente revisjon", 500);
  }
}

/**
 * PATCH /api/audits/[id]
 */
export async function PATCH(
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
    const data = await request.json();
    const existing = await prisma.audit.findFirst({
      where: { id, tenantId: sessionTenantId },
      select: { id: true },
    });
    if (!existing) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Revisjon ikke funnet", 404);
    }

    const audit = await prisma.audit.update({
      where: { id: existing.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.auditType && { auditType: data.auditType }),
        ...(data.scope && { scope: data.scope }),
        ...(data.criteria && { criteria: data.criteria }),
        ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
        ...(data.completedAt && { completedAt: new Date(data.completedAt) }),
        ...(data.area && { area: data.area }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.status && { status: data.status }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.conclusion !== undefined && { conclusion: data.conclusion }),
        ...(data.teamMemberIds !== undefined && {
          teamMemberIds: data.teamMemberIds ? JSON.stringify(data.teamMemberIds) : null,
        }),
      },
      include: {
        findings: true,
      },
    });

    return createSuccessResponse({ audit }, "Revisjon oppdatert");
  } catch (error) {
    console.error("[Audit PATCH] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke oppdatere revisjon", 500);
  }
}

/**
 * DELETE /api/audits/[id]
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
    const existing = await prisma.audit.findFirst({
      where: { id, tenantId: sessionTenantId },
      select: { id: true },
    });
    if (!existing) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Revisjon ikke funnet", 404);
    }

    await prisma.audit.delete({
      where: { id: existing.id },
    });

    return createSuccessResponse(undefined, "Revisjon slettet");
  } catch (error) {
    console.error("[Audit DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette revisjon", 500);
  }
}

