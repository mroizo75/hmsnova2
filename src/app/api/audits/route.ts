import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/audits
 * List all audits for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
      include: { tenant: true },
    });

    if (userTenants.length === 0) {
      return createSuccessResponse({ audits: [] });
    }

    const tenantId = userTenants[0].tenantId;

    const audits = await prisma.audit.findMany({
      where: { tenantId },
      include: {
        findings: true,
      },
      orderBy: { scheduledDate: "desc" },
    });

    return createSuccessResponse({ audits });
  } catch (error) {
    console.error("[Audits GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente revisjoner", 500);
  }
}

/**
 * POST /api/audits
 * Create new audit
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
    });

    if (userTenants.length === 0) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }

    const tenantId = userTenants[0].tenantId;
    const data = await request.json();

    const audit = await prisma.audit.create({
      data: {
        tenantId,
        title: data.title,
        auditType: data.auditType || "INTERNAL",
        scope: data.scope,
        criteria: data.criteria,
        leadAuditorId: data.leadAuditorId || session.user.id,
        teamMemberIds: data.teamMemberIds ? JSON.stringify(data.teamMemberIds) : null,
        scheduledDate: new Date(data.scheduledDate),
        area: data.area,
        department: data.department,
        status: "PLANNED",
      },
      include: {
        findings: true,
      },
    });

    return createSuccessResponse({ audit }, "Revisjon opprettet", 201);
  } catch (error) {
    console.error("[Audits POST] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke opprette revisjon", 500);
  }
}

