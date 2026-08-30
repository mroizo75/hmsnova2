import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { IK_MAT_SUBCATEGORY } from "@/lib/ik-mat-avvik";
import { createIkMatDeviation } from "@/server/ik-mat-incident";

const schema = z.object({
  module: z.enum(["haccp", "allergen"]),
  title: z.string().min(5).max(200),
  description: z.string().min(5).max(2000),
  location: z.string().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateInspections) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    }

    const subcategoryKey =
      parsed.data.module === "haccp" ? IK_MAT_SUBCATEGORY.haccp : IK_MAT_SUBCATEGORY.allergen;

    const incident = await createIkMatDeviation({
      tenantId: session.user.tenantId,
      reportedBy: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      subcategoryKey,
    });

    return createSuccessResponse({ incident }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
