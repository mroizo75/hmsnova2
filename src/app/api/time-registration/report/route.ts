import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { getTimeReportDateRange } from "@/lib/time/report-range";
import {
  generateTimeRegistrationExcel,
  generateTimeRegistrationPdf,
} from "@/lib/time-registration-report-generator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perms = getPermissions(session.user.role as Role);
    if (!perms.canAccessTimeRegistration) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
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
    const date = searchParams.get("date") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const requestedUserId = searchParams.get("userId") || undefined;

    const scopedUserId = perms.canViewAllReports
      ? requestedUserId
      : session.user.id;

    const { from, to } = getTimeReportDateRange({ period, year, month, week, date });

    const [tenant, timeEntries, mileageEntries, userTenants, project, scopedUser] =
      await Promise.all([
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
            ...(scopedUserId ? { userId: scopedUserId } : {}),
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
            ...(scopedUserId ? { userId: scopedUserId } : {}),
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
        projectId
          ? prisma.project.findFirst({
              where: { id: projectId, tenantId: session.user.tenantId },
              select: { name: true, code: true },
            })
          : Promise.resolve(null),
        scopedUserId
          ? prisma.user.findUnique({
              where: { id: scopedUserId },
              select: { name: true, email: true },
            })
          : Promise.resolve(null),
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

    const filterParts: string[] = [];
    if (project) {
      filterParts.push(
        project.code ? `${project.name} (${project.code})` : project.name
      );
    }
    if (scopedUserId) {
      const name =
        userDisplayNames[scopedUserId] ||
        scopedUser?.name ||
        scopedUser?.email ||
        "Ansatt";
      filterParts.push(name);
    }

    const reportData = {
      tenantName: tenant.name,
      dateRange: { from, to },
      timeEntries,
      mileageEntries,
      userDisplayNames,
      filterSummary: filterParts.length > 0 ? filterParts.join(" · ") : undefined,
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

    const stamp = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;

    if (format === "pdf") {
      const buffer = await generateTimeRegistrationPdf(reportData);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="timeregistrering_${stamp}.pdf"`,
        },
      });
    }

    const buffer = await generateTimeRegistrationExcel(reportData);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="timeregistrering_${stamp}.xlsx"`,
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
