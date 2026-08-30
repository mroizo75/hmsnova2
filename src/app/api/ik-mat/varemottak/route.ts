import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  receivedAt: z.string().datetime(),
  supplier: z.string().min(1).max(200),
  productName: z.string().min(1).max(200),
  batchLot: z.string().max(100).optional().nullable(),
  temperature: z.number().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  accepted: z.boolean().optional().default(true),
  usedIn: z.string().max(200).optional().nullable(),
  discardedAt: z.string().datetime().optional().nullable(),
  receivedBy: z.string().max(100).optional().nullable(),
  deviationNote: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const items = await prisma.matVaremottak.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { receivedAt: "desc" },
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

    const item = await prisma.matVaremottak.create({
      data: {
        tenantId: session.user.tenantId,
        receivedAt: new Date(parsed.data.receivedAt),
        supplier: parsed.data.supplier,
        productName: parsed.data.productName,
        batchLot: parsed.data.batchLot ?? null,
        temperature: parsed.data.temperature ?? null,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        accepted: parsed.data.accepted,
        usedIn: parsed.data.usedIn ?? null,
        discardedAt: parsed.data.discardedAt ? new Date(parsed.data.discardedAt) : null,
        receivedBy: parsed.data.receivedBy ?? null,
        deviationNote: parsed.data.deviationNote ?? null,
      },
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

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "id mangler", 400);

    const existing = await prisma.matVaremottak.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!existing) return createErrorResponse(ErrorCodes.NOT_FOUND, "Varemottak ikke funnet", 404);

    const parsed = schema.partial().safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const item = await prisma.matVaremottak.update({
      where: { id },
      data: {
        ...parsed.data,
        receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : undefined,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : parsed.data.expiryDate,
        discardedAt: parsed.data.discardedAt ? new Date(parsed.data.discardedAt) : parsed.data.discardedAt,
      },
    });
    return createSuccessResponse({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
