import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) return createErrorResponse(ErrorCodes.FORBIDDEN, "Kun superadmin", 403);

    const { id } = await params;
    const sub = await prisma.hmsTavleSubscription.findUnique({ where: { id } });
    if (!sub) return createErrorResponse(ErrorCodes.NOT_FOUND, "Abonnement ikke funnet", 404);

    const updated = await prisma.hmsTavleSubscription.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
