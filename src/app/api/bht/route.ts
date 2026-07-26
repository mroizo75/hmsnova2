import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { getPermissions } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  leverandorNavn: z.string().min(2).max(200),
  leverandorOrgnr: z.string().max(20).optional().nullable(),
  kontaktperson: z.string().max(100).optional().nullable(),
  kontaktTelefon: z.string().max(30).optional().nullable(),
  kontaktEpost: z.string().email().optional().nullable(),
  startDato: z.string().datetime(),
  sluttDato: z.string().datetime().optional().nullable(),
  arsTimeverk: z.number().int().min(1).optional().nullable(),
  naringskode: z.string().max(20).optional().nullable(),
  bransjeKrav: z.string().max(500).optional().nullable(),
  avtaleUrl: z.string().url().optional().nullable(),
  notat: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const avtaler = await prisma.bhtAvtale.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { startDato: "desc" },
    });

    return createSuccessResponse({ avtaler });
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

    const avtale = await prisma.bhtAvtale.create({
      data: {
        tenantId: session.user.tenantId,
        leverandorNavn: parsed.data.leverandorNavn,
        leverandorOrgnr: parsed.data.leverandorOrgnr ?? null,
        kontaktperson: parsed.data.kontaktperson ?? null,
        kontaktTelefon: parsed.data.kontaktTelefon ?? null,
        kontaktEpost: parsed.data.kontaktEpost ?? null,
        startDato: new Date(parsed.data.startDato),
        sluttDato: parsed.data.sluttDato ? new Date(parsed.data.sluttDato) : null,
        arsTimeverk: parsed.data.arsTimeverk ?? null,
        naringskode: parsed.data.naringskode ?? null,
        bransjeKrav: parsed.data.bransjeKrav ?? null,
        avtaleUrl: parsed.data.avtaleUrl ?? null,
        notat: parsed.data.notat ?? null,
      },
    });

    return createSuccessResponse({ avtale }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
