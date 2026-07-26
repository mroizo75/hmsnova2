import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";

const schema = z.object({
  utstyrsType: z.enum(["KANO", "SYKKEL", "SKI", "KLATREVEGG", "ZIPLINE", "ANNET"]),
  utstyrsNavn: z.string().min(1).max(100),
  checkDate: z.string().datetime(),
  checkedBy: z.string().max(100).optional().nullable(),
  status: z.enum(["OK", "AVVIK", "KASSERT"]).default("OK"),
  findings: z.string().max(2000).optional().nullable(),
  actionsTaken: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const sjekker = await prisma.aktivitetsUtstyrssjekk.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { checkDate: "desc" },
      take: 100,
    });

    return createSuccessResponse({ sjekker });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const sjekk = await prisma.aktivitetsUtstyrssjekk.create({
      data: {
        tenantId: session.user.tenantId,
        utstyrsType: parsed.data.utstyrsType,
        utstyrsNavn: parsed.data.utstyrsNavn,
        checkDate: new Date(parsed.data.checkDate),
        checkedBy: parsed.data.checkedBy ?? null,
        status: parsed.data.status,
        findings: parsed.data.findings ?? null,
        actionsTaken: parsed.data.actionsTaken ?? null,
      },
    });

    return createSuccessResponse({ sjekk }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
