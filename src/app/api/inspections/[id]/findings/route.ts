import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";
import { generateSequenceNumber } from "@/lib/sequence";

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

    const sessionTenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!sessionTenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const { id: inspectionId } = await params;
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId: sessionTenantId },
      select: {
        id: true,
        tenantId: true,
        title: true,
        location: true,
      },
    });
    if (!inspection) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Inspeksjon ikke funnet", 404);
    }

    const findings = await prisma.inspectionFinding.findMany({
      where: { inspectionId: inspection.id },
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

    const sessionTenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!sessionTenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const { id: inspectionId } = await params;
    const data = await request.json();
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId: sessionTenantId },
      select: {
        id: true,
        tenantId: true,
        title: true,
        location: true,
      },
    });
    if (!inspection) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Inspeksjon ikke funnet", 404);
    }

    const finding = await prisma.inspectionFinding.create({
      data: {
        inspectionId: inspection.id,
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

    const occurredAt = new Date();
    const avviksnummer = await generateSequenceNumber(
      inspection.tenantId,
      "AVVIK",
      occurredAt.getFullYear()
    );
    const findingDescription = typeof data.description === "string" ? data.description.trim() : "";
    const findingLocation = typeof data.location === "string" ? data.location.trim() : "";
    const inspectionContext = `Kilde: Vernerunde "${inspection.title}"`;
    const incidentDescription = findingLocation
      ? `${inspectionContext}\nLokasjon i funn: ${findingLocation}\n\n${findingDescription}`
      : `${inspectionContext}\n\n${findingDescription}`;

    await prisma.incident.create({
      data: {
        tenantId: inspection.tenantId,
        avviksnummer,
        type: "AVVIK",
        title: `[Vernerunde] ${finding.title}`,
        description: incidentDescription,
        // Null = ikke vurdert; leder setter grad ved behandling av avviket
        severity:
          typeof data.severity === "number"
            ? Math.max(1, Math.min(5, data.severity))
            : null,
        occurredAt,
        reportedBy: session.user.id,
        location: findingLocation || inspection.location || null,
      },
    });

    return createSuccessResponse({ finding }, "Funn registrert", 201);
  } catch (error) {
    console.error("[Inspection Finding POST] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke registrere funn", 500);
  }
}

