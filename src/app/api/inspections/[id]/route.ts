import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/inspections/[id]
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

    const inspection = await prisma.inspection.findUnique({
      where: { id },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;
    const data = await request.json();

    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.status && { status: data.status }),
        ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
        ...(data.completedDate && { completedDate: new Date(data.completedDate) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.participants !== undefined && {
          participants: data.participants ? JSON.stringify(data.participants) : null,
        }),
      },
      include: {
        findings: true,
      },
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;

    await prisma.inspection.delete({
      where: { id },
    });

    return createSuccessResponse(undefined, "Inspeksjon slettet");
  } catch (error) {
    console.error("[Inspection DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette inspeksjon", 500);
  }
}

