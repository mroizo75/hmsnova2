import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/inspections/[id]/findings
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

    const { id: inspectionId } = await params;

    const findings = await prisma.inspectionFinding.findMany({
      where: { inspectionId },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ findings });
  } catch (error) {
    console.error("[Inspection Findings GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente funn", 500);
  }
}

/**
 * POST /api/inspections/[id]/findings
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

    const { id: inspectionId } = await params;
    const data = await request.json();

    const finding = await prisma.inspectionFinding.create({
      data: {
        inspectionId,
        title: data.title,
        description: data.description,
        severity: data.severity || 3,
        location: data.location,
        imageKeys: data.imageKeys ? JSON.stringify(data.imageKeys) : null,
        status: "OPEN",
        responsibleId: data.responsibleId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return createSuccessResponse({ finding }, "Funn registrert", 201);
  } catch (error) {
    console.error("[Inspection Finding POST] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke registrere funn", 500);
  }
}

