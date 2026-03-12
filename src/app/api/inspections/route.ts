import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

/**
 * GET /api/inspections
 * List all inspections for tenant
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
      return createSuccessResponse({ inspections: [] });
    }

    const tenantId = userTenants[0].tenantId;

    const inspections = await prisma.inspection.findMany({
      where: { tenantId },
      include: {
        findings: true,
      },
      orderBy: { scheduledDate: "desc" },
    });

    return createSuccessResponse({ inspections });
  } catch (error) {
    console.error("[Inspections GET] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke hente inspeksjoner", 500);
  }
}

/**
 * POST /api/inspections
 * Create new inspection
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
    let validatedProjectId: string | null = null;
    let selectedTemplate: {
      id: string;
      name: string;
      description: string | null;
      riskCategory: string | null;
      checklist: unknown;
    } | null = null;
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          tenantId,
        },
        select: { id: true },
      });
      if (!project) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Prosjekt ikke funnet", 400);
      }
      validatedProjectId = project.id;
    }
    if (data.templateId) {
      const template = await prisma.inspectionTemplate.findFirst({
        where: {
          id: data.templateId,
          OR: [{ tenantId }, { tenantId: null, isGlobal: true }],
        },
        select: {
          id: true,
          name: true,
          description: true,
          riskCategory: true,
          checklist: true,
        },
      });
      if (!template) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Mal ikke funnet", 400);
      }
      selectedTemplate = template;
    }

    const inspection = await prisma.inspection.create({
      data: {
        tenantId,
        title: data.title || selectedTemplate?.name || "Vernerunde",
        description: data.description || selectedTemplate?.description || null,
        type: data.type || "VERNERUNDE",
        status: "PLANNED",
        scheduledDate: new Date(data.scheduledDate),
        location: data.location,
        conductedBy: data.conductedBy || session.user.id,
        participants: data.participants ? JSON.stringify(data.participants) : null,
        templateId: selectedTemplate?.id ?? data.templateId ?? null,
        formTemplateId: data.formTemplateId || null,
        riskCategory: data.riskCategory || selectedTemplate?.riskCategory || null,
        area: data.area || null,
        durationMinutes: data.durationMinutes ?? null,
        followUpById: data.followUpById || null,
        nextInspection: data.nextInspection ? new Date(data.nextInspection) : null,
        checklist: (selectedTemplate?.checklist as Prisma.InputJsonValue | undefined) ?? null,
        projectId: validatedProjectId,
      },
      include: {
        findings: true,
      },
    });

    return createSuccessResponse({ inspection }, "Inspeksjon opprettet", 201);
  } catch (error) {
    console.error("[Inspections POST] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke opprette inspeksjon", 500);
  }
}

