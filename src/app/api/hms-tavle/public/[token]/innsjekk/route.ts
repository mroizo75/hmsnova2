import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { emitTavleUpdate } from "@/lib/tavle-events";

const checkinSchema = z.object({
  name: z.string().min(2, "Navn er påkrevd"),
  employer: z.string().optional(),
  hmsCardNr: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tavle = await prisma.hmsTavle.findUnique({
      where: { publicToken: token },
    });

    if (!tavle || !tavle.isPublic) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: tavle.tenantId },
    });

    if (!subscription || subscription.status === "EXPIRED") {
      return createErrorResponse("SUBSCRIPTION_EXPIRED", "Tavle-abonnementet er utløpt", 402);
    }

    if (subscription.plan === "ENKEL") {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "QR-innsjekk krever Standard- eller høyere plan", 403);
    }

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const today = new Date().toISOString().slice(0, 10);
    const checkin = await prisma.tavleCheckin.create({
      data: {
        tavleId: tavle.id,
        name: parsed.data.name,
        employer: parsed.data.employer,
        hmsCardNr: parsed.data.hmsCardNr,
        birthDate: parsed.data.birthDate,
        phone: parsed.data.phone,
        date: today,
      },
    });

    emitTavleUpdate(token);

    return createSuccessResponse({ checkin }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
