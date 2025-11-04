import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/audits/[id]/findings
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

    const { id: auditId } = await params;

    const findings = await prisma.auditFinding.findMany({
      where: { auditId },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ findings });
  } catch (error) {
    console.error("[Audit Findings GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente funn", 500);
  }
}

/**
 * POST /api/audits/[id]/findings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id: auditId } = await params;
    const data = await request.json();

    const finding = await prisma.auditFinding.create({
      data: {
        auditId,
        findingType: data.findingType || "OBSERVATION",
        clause: data.clause,
        description: data.description,
        evidence: data.evidence,
        requirement: data.requirement,
        responsibleId: data.responsibleId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: "OPEN",
      },
    });

    return createSuccessResponse({ finding }, "Funn registrert", 201);
  } catch (error) {
    console.error("[Audit Finding POST] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke registrere funn", 500);
  }
}

