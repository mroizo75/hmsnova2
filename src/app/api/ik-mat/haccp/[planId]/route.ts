import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const ccpSchema = z.object({
  stepName: z.string().min(1).max(200),
  hazardDesc: z.string().min(1),
  hazardType: z.enum(["BIOLOGISK", "KJEMISK", "FYSISK"]),
  criticalLimit: z.string().min(1).max(200),
  monitorMethod: z.string().min(1).max(200),
  monitorFreq: z.string().min(1).max(200),
  corrAction: z.string().min(1),
  verifyMethod: z.string().min(1).max(200),
  recordRequired: z.string().min(1).max(200),
  order: z.number().int().optional().default(0),
});

const updatePlanSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  approvedBy: z.string().max(100).optional().nullable(),
  ccp: z.array(ccpSchema).optional(),
});

async function getAndVerifyPlan(planId: string, tenantId: string) {
  return prisma.haccpPlan.findFirst({ where: { id: planId, tenantId } });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const { planId } = await params;
    const plan = await prisma.haccpPlan.findFirst({
      where: { id: planId, tenantId: session.user.tenantId },
      include: { ccp: { orderBy: { order: "asc" } } },
    });

    if (!plan) return createErrorResponse(ErrorCodes.NOT_FOUND, "HACCP-plan ikke funnet", 404);
    return createSuccessResponse({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { planId } = await params;
    const plan = await getAndVerifyPlan(planId, session.user.tenantId);
    if (!plan) return createErrorResponse(ErrorCodes.NOT_FOUND, "HACCP-plan ikke funnet", 404);

    const body = await req.json();
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.haccpPlan.update({
        where: { id: planId },
        data: {
          ...(parsed.data.title ? { title: parsed.data.title } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.approvedBy !== undefined ? { approvedBy: parsed.data.approvedBy, approvedAt: new Date() } : {}),
          version: { increment: 1 },
        },
      });

      if (parsed.data.ccp !== undefined) {
        await tx.haccpCcp.deleteMany({ where: { planId } });
        if (parsed.data.ccp.length > 0) {
          await tx.haccpCcp.createMany({
            data: parsed.data.ccp.map((c, i) => ({ ...c, planId, order: i })),
          });
        }
      }

      return tx.haccpPlan.findUnique({
        where: { id: planId },
        include: { ccp: { orderBy: { order: "asc" } } },
      });
    });

    return createSuccessResponse({ plan: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canDeleteInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { planId } = await params;
    const plan = await getAndVerifyPlan(planId, session.user.tenantId);
    if (!plan) return createErrorResponse(ErrorCodes.NOT_FOUND, "HACCP-plan ikke funnet", 404);

    await prisma.haccpPlan.delete({ where: { id: planId } });
    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
