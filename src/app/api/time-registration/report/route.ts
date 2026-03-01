import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateTimeRegistrationExcel,
  generateTimeRegistrationPdf,
} from "@/lib/time-registration-report-generator";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getWeek,
} from "date-fns";
import { nb } from "date-fns/locale";

function getDateRange(
  period: string,
  year?: number,
  month?: number,
  week?: number
): { from: Date; to: Date } {
  const now = new Date();
  const y = year ?? now.getFullYear();

  if (period === "week") {
    const w = week ?? getWeek(now, { weekStartsOn: 1, locale: nb });
    const from = startOfWeek(new Date(y, 0, 1 + (w - 1) * 7), {
      weekStartsOn: 1,
      locale: nb,
    });
    const to = endOfWeek(from, { weekStartsOn: 1, locale: nb });
    return { from, to };
  }

  if (period === "month") {
    const m = (month ?? now.getMonth() + 1) - 1;
    const from = startOfMonth(new Date(y, m, 1));
    const to = endOfMonth(from);
    return { from, to };
  }

  const from = startOfYear(new Date(y, 0, 1));
  const to = endOfYear(from);
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";
    const period = searchParams.get("period") || "month";
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : undefined;
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!, 10)
      : undefined;
    const week = searchParams.get("week")
      ? parseInt(searchParams.get("week")!, 10)
      : undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const { from, to } = getDateRange(period, year, month, week);

    const [tenant, timeEntries, mileageEntries, userTenants] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
          name: true,
          defaultHourlyRate: true,
          approximateTaxPercent: true,
          defaultKmRate: true,
          kmAllowanceTaxable: true,
          overtime40Multiplier: true,
          overtime50Multiplier: true,
          overtime100Multiplier: true,
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          tenantId: session.user.tenantId,
          date: { gte: from, lte: to },
          ...(projectId ? { projectId } : {}),
          ...(userId ? { userId } : {}),
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true, email: true } },
          editedBy: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }],
      }),
      prisma.mileageEntry.findMany({
        where: {
          tenantId: session.user.tenantId,
          date: { gte: from, lte: to },
          ...(projectId ? { projectId } : {}),
          ...(userId ? { userId } : {}),
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true, email: true } },
          editedBy: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }],
      }),
      prisma.userTenant.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          userId: true,
          displayName: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Virksomhet ikke funnet" }, { status: 404 });
    }

    const userDisplayNames: Record<string, string> = {};
    for (const ut of userTenants) {
      const name =
        (ut.displayName || ut.user.name || ut.user.email || "").trim();
      if (name) userDisplayNames[ut.userId] = name;
    }

    const reportData = {
      tenantName: tenant.name,
      dateRange: { from, to },
      timeEntries,
      mileageEntries,
      userDisplayNames,
      config: {
        defaultHourlyRate: tenant.defaultHourlyRate,
        approximateTaxPercent: tenant.approximateTaxPercent,
        defaultKmRate: tenant.defaultKmRate,
        kmAllowanceTaxable: tenant.kmAllowanceTaxable ?? false,
        overtime40Multiplier: tenant.overtime40Multiplier ?? 1.4,
        overtime50Multiplier: tenant.overtime50Multiplier ?? 1.5,
        overtime100Multiplier: tenant.overtime100Multiplier ?? 2,
      },
    };

    if (format === "pdf") {
      const { generateTimeRegistrationPdf } = await import(
        "@/lib/time-registration-report-generator"
      );
      const buffer = await generateTimeRegistrationPdf(reportData);
      const filename = `timeregistrering_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.pdf`;
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const buffer = await generateTimeRegistrationExcel(reportData);
    const filename = `timeregistrering_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Kunne ikke generere rapport" },
      { status: 500 }
    );
  }
}
