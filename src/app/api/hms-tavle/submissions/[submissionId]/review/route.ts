import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
  linkTo: z
    .object({
      incidentId: z.string().optional(),
      ruhId: z.string().optional(),
      sjaId: z.string().optional(),
    })
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canReviewSubmissions) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang til å behandle innsendinger", 403);

    const { submissionId } = await params;
    const submission = await prisma.subcontractorSubmission.findFirst({
      where: { id: submissionId, tenantId: session.user.tenantId },
    });
    if (!submission) return createErrorResponse(ErrorCodes.NOT_FOUND, "Innsending ikke funnet", 404);

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const updated = await prisma.subcontractorSubmission.update({
      where: { id: submissionId },
      data: {
        status: parsed.data.action === "approve" ? "LINKED" : "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.notes,
        linkedIncidentId: parsed.data.linkTo?.incidentId,
        linkedRuhId: parsed.data.linkTo?.ruhId,
        linkedSjaId: parsed.data.linkTo?.sjaId,
      },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
