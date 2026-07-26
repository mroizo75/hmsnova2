import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { getPermissions } from "@/lib/permissions";
import { z } from "zod";

const sjaforSchema = z.object({
  driverName: z.string().min(2).max(100),
  driverPhone: z.string().max(30).optional().nullable(),
  kompetansebevis: z.string().max(50).optional().nullable(),
  kbUtlopDato: z.string().datetime().optional().nullable(),
  forerkortNr: z.string().max(50).optional().nullable(),
  forerkortKlasse: z.string().max(20).optional().nullable(),
  forerkortUtlop: z.string().datetime().optional().nullable(),
  adrSertifikat: z.string().max(50).optional().nullable(),
  adrUtlop: z.string().datetime().optional().nullable(),
  notat: z.string().max(2000).optional().nullable(),
});

const loyveSchema = z.object({
  loyveType: z.enum(["RUTELOEYVE", "TURVOGN", "GODS", "TURBUSS"]),
  loyveNummer: z.string().min(2).max(100),
  kjoretoyReg: z.string().max(20).optional().nullable(),
  utstedtAv: z.string().max(100).optional().nullable(),
  utlopDato: z.string().datetime().optional().nullable(),
  vilkar: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const [sjaforDokumenter, loyveRegister] = await Promise.all([
      prisma.sjaforDokument.findMany({
        where: { tenantId: session.user.tenantId, isActive: true },
        orderBy: { driverName: "asc" },
      }),
      prisma.loyveRegister.findMany({
        where: { tenantId: session.user.tenantId, isActive: true },
        orderBy: { loyveType: "asc" },
      }),
    ]);

    return createSuccessResponse({ sjaforDokumenter, loyveRegister });
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

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    const body = await req.json();

    if (type === "loyve") {
      const parsed = loyveSchema.safeParse(body);
      if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
      const loyve = await prisma.loyveRegister.create({
        data: {
          tenantId: session.user.tenantId,
          ...parsed.data,
          utlopDato: parsed.data.utlopDato ? new Date(parsed.data.utlopDato) : null,
        },
      });
      return createSuccessResponse({ loyve }, undefined, 201);
    }

    const parsed = sjaforSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    const doc = await prisma.sjaforDokument.create({
      data: {
        tenantId: session.user.tenantId,
        ...parsed.data,
        kbUtlopDato: parsed.data.kbUtlopDato ? new Date(parsed.data.kbUtlopDato) : null,
        forerkortUtlop: parsed.data.forerkortUtlop ? new Date(parsed.data.forerkortUtlop) : null,
        adrUtlop: parsed.data.adrUtlop ? new Date(parsed.data.adrUtlop) : null,
      },
    });
    return createSuccessResponse({ doc }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
