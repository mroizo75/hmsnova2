import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { getClientIp } from "@/lib/rate-limit";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";
import { buildOversiktslisteCsv } from "@/features/hms-tavle/lib/oversiktsliste-config";

/**
 * Oversiktslisten for en bygge- eller anleggsplass – Byggherreforskriften § 15.
 *
 * § 15 fjerde ledd krever at listen er tilgjengelig og på oppfordring kan vises til
 * arbeidsgiveren, verneombudet, Arbeidstilsynet og skattemyndighetene. Endepunktet
 * gir både historikkvisning i dashboardet og nedlastbar CSV til slik framvisning.
 */

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  from: z.string().regex(ISO_DATO).optional(),
  to: z.string().regex(ISO_DATO).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

const MAX_RADER = 5000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      format: searchParams.get("format") ?? undefined,
    });

    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ugyldig datofilter", 400);
    }

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: {
        id: true,
        name: true,
        siteAddress: true,
        clientName: true,
        workEndedAt: true,
        project: { select: { name: true, location: true, clientName: true, endDate: true } },
      },
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const { from, to, format } = parsed.data;
    const checkins = await prisma.tavleCheckin.findMany({
      where: {
        tavleId: id,
        ...(from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      orderBy: [{ date: "desc" }, { checkedInAt: "asc" }],
      take: MAX_RADER,
    });

    // Standalone-tavler fyller inn opplysningene selv. Er tavlen koblet til et
    // HMS Nova-prosjekt, hentes de derfra når de ikke er overstyrt.
    const kontekst = {
      siteName: tavle.project?.name ?? tavle.name,
      siteAddress: tavle.siteAddress ?? tavle.project?.location ?? null,
      clientName: tavle.clientName ?? tavle.project?.clientName ?? null,
    };

    if (format === "json") {
      return createSuccessResponse({
        checkins,
        truncated: checkins.length === MAX_RADER,
        site: kontekst,
        workEndedAt: tavle.workEndedAt ?? tavle.project?.endDate ?? null,
      });
    }

    const csv = buildOversiktslisteCsv(checkins, kontekst);

    // Uttrekk av personopplysninger skal kunne etterprøves.
    await AuditLog.log(
      session.user.tenantId,
      session.user.id,
      "TAVLE_OVERSIKTSLISTE_EXPORTED",
      "HmsTavle",
      id,
      { antallRader: checkins.length, fra: from ?? null, til: to ?? null },
      getClientIp(req),
      req.headers.get("user-agent") ?? undefined
    );

    const filnavn = `oversiktsliste-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filnavn}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
