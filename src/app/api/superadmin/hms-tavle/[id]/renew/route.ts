import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const renewSchema = z.object({
  months: z.number().int().min(1).max(36).default(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) return createErrorResponse(ErrorCodes.FORBIDDEN, "Kun superadmin", 403);

    const { id } = await params;
    const sub = await prisma.hmsTavleSubscription.findUnique({ where: { id } });
    if (!sub) return createErrorResponse(ErrorCodes.NOT_FOUND, "Abonnement ikke funnet", 404);

    const body = await req.json();
    const parsed = renewSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const currentEnd = sub.endsAt > new Date() ? sub.endsAt : new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + parsed.data.months);

    const updated = await prisma.hmsTavleSubscription.update({
      where: { id },
      data: {
        endsAt: newEnd,
        status: "ACTIVE",
      },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
