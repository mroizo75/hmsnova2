import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["NY", "LEST", "BEHANDLET", "LUKKET"]).optional(),
  response: z.string().max(2000).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const { id } = await params;
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const submissions = await prisma.tavleGuestSubmission.findMany({
      where: {
        tavleId: id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ submissions });
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
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("submissionId");
    if (!submissionId) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "submissionId mangler", 400);

    const submission = await prisma.tavleGuestSubmission.findFirst({
      where: { id: submissionId },
      include: { tavle: { select: { tenantId: true } } },
    });
    if (!submission || submission.tavle.tenantId !== session.user.tenantId) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Innmelding ikke funnet", 404);
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const updated = await prisma.tavleGuestSubmission.update({
      where: { id: submissionId },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.response !== undefined ? {
          response: parsed.data.response,
          respondedAt: parsed.data.response ? new Date() : null,
        } : {}),
      },
    });

    return createSuccessResponse({ updated });
  } catch (error) {
    return handleApiError(error);
  }
}
