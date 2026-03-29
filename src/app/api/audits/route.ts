import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

const resolveSelectedTenantId = async (userId: string, sessionTenantId?: string | null): Promise<string | null> => {
  if (!sessionTenantId) {
    return null;
  }

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId: sessionTenantId,
      },
    },
    select: { tenantId: true },
  });

  return membership?.tenantId ?? null;
};

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

    const tenantId = await resolveSelectedTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }

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

    const tenantId = await resolveSelectedTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
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

