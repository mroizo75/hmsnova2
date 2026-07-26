import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const plans = await prisma.haccpPlan.findMany({
      where: { tenantId: session.user.tenantId },
      include: { ccp: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });

    return createSuccessResponse({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const plan = await prisma.haccpPlan.create({
      data: {
        tenantId: session.user.tenantId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
      },
      include: { ccp: true },
    });

    return createSuccessResponse({ plan }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
