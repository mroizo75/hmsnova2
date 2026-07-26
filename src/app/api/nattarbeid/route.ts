import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { getPermissions } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  stillingNavn: z.string().min(2).max(200),
  begrunnelse: z.string().min(10).max(5000),
  alternativVurd: z.string().max(3000).optional().nullable(),
  helseVurdering: z.boolean().optional().default(false),
  samRadVo: z.boolean().optional().default(false),
  godkjentAv: z.string().max(100).optional().nullable(),
  gyldigTil: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const vurderinger = await prisma.nattarbeidVurdering.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ vurderinger });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canCreateDocuments) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const vurdering = await prisma.nattarbeidVurdering.create({
      data: {
        tenantId: session.user.tenantId,
        stillingNavn: parsed.data.stillingNavn,
        begrunnelse: parsed.data.begrunnelse,
        alternativVurd: parsed.data.alternativVurd ?? null,
        helseVurdering: parsed.data.helseVurdering,
        samRadVo: parsed.data.samRadVo,
        godkjentAv: parsed.data.godkjentAv ?? null,
        gyldigTil: parsed.data.gyldigTil ? new Date(parsed.data.gyldigTil) : null,
      },
    });

    return createSuccessResponse({ vurdering }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
