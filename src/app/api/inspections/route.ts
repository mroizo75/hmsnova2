import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
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

function buildChecklistFromFormTemplateFields(
  fields: Array<{ label: string; fieldType: string }>
): Prisma.InputJsonValue | null {
  const checklistItems = fields
    .filter((field) => {
      const normalizedType = field.fieldType.toUpperCase();
      return normalizedType !== "SECTION" && normalizedType !== "HEADING";
    })
    .map((field) => ({
      type: "item" as const,
      title: field.label,
      checked: false,
      status: "UNSET" as const,
      findingTitle: "",
      findingDescription: "",
      findingSeverity: 3,
      findingLocation: "",
      findingImageKeys: [] as string[],
    }));

  if (checklistItems.length === 0) {
    return null;
  }

  return {
    items: checklistItems,
  } as Prisma.InputJsonValue;
}

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

    const tenantId = await resolveSelectedTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }

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

    const tenantId = await resolveSelectedTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tenant tilgang", 403);
    }
    const data = await request.json();
    let validatedProjectId: string | null = null;
    let selectedTemplate: {
      id: string;
      name: string;
      description: string | null;
      riskCategory: string | null;
      checklist: unknown;
    } | null = null;
    let selectedFormTemplateChecklist: Prisma.InputJsonValue | null = null;
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
    if (data.formTemplateId) {
      const formTemplate = await prisma.formTemplate.findFirst({
        where: {
          id: data.formTemplateId,
          OR: [{ tenantId }, { tenantId: null, isGlobal: true }],
        },
        select: {
          fields: {
            orderBy: { order: "asc" },
            select: {
              label: true,
              fieldType: true,
            },
          },
        },
      });
      if (formTemplate) {
        selectedFormTemplateChecklist = buildChecklistFromFormTemplateFields(formTemplate.fields);
      }
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
        checklist:
          (selectedTemplate?.checklist as Prisma.InputJsonValue | undefined) ??
          selectedFormTemplateChecklist ??
          null,
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

