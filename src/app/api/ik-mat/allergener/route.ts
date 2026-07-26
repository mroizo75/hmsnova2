import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const allergenSchema = z.object({
  dishName: z.string().min(1).max(200),
  category: z.string().max(100).optional().nullable(),
  hasGluten: z.boolean().optional().default(false),
  hasKrepsdyr: z.boolean().optional().default(false),
  hasEgg: z.boolean().optional().default(false),
  hasFisk: z.boolean().optional().default(false),
  hasPeanut: z.boolean().optional().default(false),
  hasSoya: z.boolean().optional().default(false),
  hasMelk: z.boolean().optional().default(false),
  hasNotter: z.boolean().optional().default(false),
  hasSelleri: z.boolean().optional().default(false),
  hasSennep: z.boolean().optional().default(false),
  hasSesamfro: z.boolean().optional().default(false),
  hasSulfitt: z.boolean().optional().default(false),
  hasLupin: z.boolean().optional().default(false),
  hasBlotkdyr: z.boolean().optional().default(false),
  additionalInfo: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") !== "false";

    const items = await prisma.allergenOversikt.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ category: "asc" }, { dishName: "asc" }],
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

    const body = await req.json();
    const parsed = allergenSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const item = await prisma.allergenOversikt.create({
      data: { tenantId: session.user.tenantId, ...parsed.data },
    });

    return createSuccessResponse({ item }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "id mangler", 400);

    const existing = await prisma.allergenOversikt.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!existing) return createErrorResponse(ErrorCodes.NOT_FOUND, "Allergenoversikt-element ikke funnet", 404);

    const body = await req.json();
    const parsed = allergenSchema.partial().safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const updated = await prisma.allergenOversikt.update({
      where: { id },
      data: { ...parsed.data, lastVerified: new Date() },
    });

    return createSuccessResponse({ item: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
