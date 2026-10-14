import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { skjenkeBevillingSchema } from "@/features/skjenking/schemas/skjenking.schema";

function dateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const bevilling = await prisma.skjenkeBevilling.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { updatedAt: "desc" },
    });
    return createSuccessResponse({ bevilling });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role, session.user.extraRoles);
    if (!perms.canCreateInspections) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const parsed = skjenkeBevillingSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const data = {
      bevillingstype: parsed.data.bevillingstype,
      ambulerende: parsed.data.ambulerende,
      bevillingsnummer: parsed.data.bevillingsnummer ?? null,
      kommune: parsed.data.kommune ?? null,
      gyldigFra: dateOrNull(parsed.data.gyldigFra),
      gyldigTil: dateOrNull(parsed.data.gyldigTil),
      gruppe1: parsed.data.gruppe1,
      gruppe2: parsed.data.gruppe2,
      gruppe3: parsed.data.gruppe3,
      styrer: parsed.data.styrer ?? null,
      stedfortreder: parsed.data.stedfortreder ?? null,
      styrerProveDato: dateOrNull(parsed.data.styrerProveDato),
      stedfortrederProveDato: dateOrNull(parsed.data.stedfortrederProveDato),
      skjenketider: parsed.data.skjenketider ?? null,
      internregler: parsed.data.internregler ?? null,
      alderskontrollAnsvar: parsed.data.alderskontrollAnsvar ?? null,
      beruselseAnsvar: parsed.data.beruselseAnsvar ?? null,
      bortvisningAnsvar: parsed.data.bortvisningAnsvar ?? null,
      opplaeringAnsvar: parsed.data.opplaeringAnsvar ?? null,
      alkoholfrittUtvalg: parsed.data.alkoholfrittUtvalg ?? null,
      harHalvflasker: parsed.data.harHalvflasker,
      harMinibar: parsed.data.harMinibar,
      sarvilkar: parsed.data.sarvilkar ?? null,
      sistOmsetningsoppgave: dateOrNull(parsed.data.sistOmsetningsoppgave),
    };

    const existing = await prisma.skjenkeBevilling.findFirst({
      where: { tenantId: session.user.tenantId },
    });

    const bevilling = existing
      ? await prisma.skjenkeBevilling.update({ where: { id: existing.id }, data })
      : await prisma.skjenkeBevilling.create({
          data: { tenantId: session.user.tenantId, ...data },
        });

    return createSuccessResponse({ bevilling });
  } catch (error) {
    return handleApiError(error);
  }
}
