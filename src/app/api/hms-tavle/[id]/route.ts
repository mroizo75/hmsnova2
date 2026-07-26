import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { emitTavleUpdate } from "@/lib/tavle-events";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  kioskMode: z.boolean().optional(),
  logoUrl: z.string().url().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  bransje: z.string().optional().nullable(),
  manualContacts: z.array(z.any()).optional(),
  manualDocuments: z.array(z.any()).optional(),
  // Opplysninger til oversiktslisten – Byggherreforskriften § 15 bokstav a og b
  siteAddress: z.string().max(255).optional().nullable(),
  clientName: z.string().max(255).optional().nullable(),
  // Sluttdato styrer når oversiktslisten kan slettes, jf. § 15 fjerde ledd
  workEndedAt: z.coerce.date().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canViewHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { id } = await params;
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        sections: { orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: {
          include: {
            submissions: { orderBy: { createdAt: "desc" }, take: 50 },
          },
        },
        project: {
          include: {
            constructionShaPlan: { select: { status: true, updatedAt: true } },
            constructionPreNotification: { select: { status: true, sentAt: true } },
            constructionRosterEntries: { orderBy: { createdAt: "desc" }, take: 100 },
          },
        },
        checkins: {
          where: { date: new Date().toISOString().slice(0, 10) },
          orderBy: { checkedInAt: "asc" },
        },
      },
    });

    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    return createSuccessResponse(tavle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { id } = await params;
    const existing = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!existing) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const tavle = await prisma.hmsTavle.update({
      where: { id },
      data: parsed.data as any,
    });

    emitTavleUpdate(tavle.publicToken);

    return createSuccessResponse(tavle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const { id } = await params;
    const existing = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!existing) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    await prisma.hmsTavle.delete({ where: { id } });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
