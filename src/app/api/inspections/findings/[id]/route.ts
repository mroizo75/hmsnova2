import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * PATCH /api/inspections/findings/[id]
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

    const finding = await prisma.inspectionFinding.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.severity && { severity: data.severity }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.imageKeys !== undefined && {
          imageKeys: data.imageKeys ? JSON.stringify(data.imageKeys) : null,
        }),
        ...(data.status && { status: data.status }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.resolutionNotes !== undefined && { resolutionNotes: data.resolutionNotes }),
        ...(data.status === "RESOLVED" && { resolvedAt: new Date() }),
      },
    });

    return createSuccessResponse({ finding }, "Funn oppdatert");
  } catch (error) {
    console.error("[Inspection Finding PATCH] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke oppdatere funn", 500);
  }
}

/**
 * DELETE /api/inspections/findings/[id]
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

    await prisma.inspectionFinding.delete({
      where: { id },
    });

    return createSuccessResponse(undefined, "Funn slettet");
  } catch (error) {
    console.error("[Inspection Finding DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette funn", 500);
  }
}

