import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  cleanedAt: z.string().datetime(),
  area: z.string().min(1).max(200),
  task: z.string().min(1).max(200),
  cleanedBy: z.string().max(100).optional().nullable(),
  approved: z.boolean().optional().default(true),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const items = await prisma.matRenhold.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { cleanedAt: "desc" },
      take: 200,
    });
    return createSuccessResponse({ items });
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

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const item = await prisma.matRenhold.create({
      data: {
        tenantId: session.user.tenantId,
        cleanedAt: new Date(parsed.data.cleanedAt),
        area: parsed.data.area,
        task: parsed.data.task,
        cleanedBy: parsed.data.cleanedBy ?? null,
        approved: parsed.data.approved,
        note: parsed.data.note ?? null,
      },
    });
    return createSuccessResponse({ item }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
