import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { GuestSubmissionType } from "@prisma/client";

const schema = z.object({
  type: z.nativeEnum(GuestSubmissionType),
  message: z.string().min(5, "Meldingen er for kort").max(2000),
  guestName: z.string().max(100).optional().nullable(),
  guestEmail: z.string().email("Ugyldig e-postadresse").max(200).optional().nullable(),
  guestPhone: z.string().max(30).optional().nullable(),
  roomOrTable: z.string().max(50).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const tavle = await prisma.hmsTavle.findUnique({
      where: { publicToken: token },
      select: { id: true, isPublic: true, tenantId: true, name: true },
    });

    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);
    if (!tavle.isPublic) return createErrorResponse(ErrorCodes.FORBIDDEN, "Tavle er ikke offentlig tilgjengelig", 403);

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: tavle.tenantId },
    });
    if (!subscription || subscription.status === "EXPIRED") {
      return createErrorResponse("SUBSCRIPTION_EXPIRED", "Tavle-abonnementet er utløpt", 402);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    }

    const submission = await prisma.tavleGuestSubmission.create({
      data: {
        tavleId: tavle.id,
        type: parsed.data.type,
        message: parsed.data.message,
        guestName: parsed.data.guestName ?? null,
        guestEmail: parsed.data.guestEmail ?? null,
        guestPhone: parsed.data.guestPhone ?? null,
        roomOrTable: parsed.data.roomOrTable ?? null,
        status: "NY",
      },
    });

    return createSuccessResponse({ id: submission.id }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
