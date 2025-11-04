import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;

    const audit = await prisma.audit.findUnique({
      where: { id },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;
    const data = await request.json();

    const audit = await prisma.audit.update({
      where: { id },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;

    await prisma.audit.delete({
      where: { id },
    });

    return createSuccessResponse(undefined, "Revisjon slettet");
  } catch (error) {
    console.error("[Audit DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette revisjon", 500);
  }
}

