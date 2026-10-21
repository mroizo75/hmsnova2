import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TimeEntryType } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hoursToClock } from "@/lib/time/split-day";
import { createAbsence } from "@/server/actions/absence.actions";
import { addUsageToDay, submitDayTimesheet } from "@/server/actions/timesheet.actions";

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const parseHours = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value <= 0 || value > 24) {
    return null;
  }
  return value;
};

const parseKilometers = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value <= 0 || value > 2000) {
    return null;
  }
  return value;
};

const parseComment = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseClock = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const parseLunchMinutes = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0 || value > 180) {
    return null;
  }
  return Math.round(value);
};

const parseCarKind = (value: unknown): "PRIVATE" | "COMPANY" | null => {
  if (value === "PRIVATE" || value === "COMPANY") {
    return value;
  }
  return null;
};

const parseTimeType = (value: unknown): TimeEntryType | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  const validTypes = new Set<TimeEntryType>([
    "NORMAL",
    "OVERTIME_50",
    "OVERTIME_40",
    "OVERTIME_100",
    "WEEKEND",
    "TRAVEL",
    "SICK_LEAVE",
  ]);
  return validTypes.has(normalized as TimeEntryType) ? (normalized as TimeEntryType) : null;
};

const absenceTypes = new Set([
  "SELF_CERTIFIED",
  "SICK_LEAVE",
  "PARENTAL_LEAVE",
  "VACATION",
  "LEAVE_OF_ABSENCE",
  "COMPENSATORY",
  "CARE_DAYS",
  "MILITARY",
  "BEREAVEMENT",
  "OTHER",
]);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const [tenant, projects, entries, mileageEntries, absences] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
          id: true,
          timeRegistrationEnabled: true,
          defaultKmRate: true,
          kmAllowanceTaxable: true,
          lunchBreakMinutes: true,
          dayStartHour: true,
          dayEndHour: true,
          overtime50CapHours: true,
          saturdayOt50UntilHour: true,
          weeklyHoursNorm: true,
        },
      }),
      prisma.project.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: { in: ["ACTIVE", "PLANNING"] },
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
        select: {
          id: true,
          date: true,
          hours: true,
          timeType: true,
          comment: true,
          clockFrom: true,
          clockTo: true,
          lunchMinutes: true,
          approvalStatus: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 60,
      }),
      prisma.mileageEntry.findMany({
        where: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
        select: {
          id: true,
          date: true,
          kilometers: true,
          ratePerKm: true,
          amount: true,
          comment: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 60,
      }),
      prisma.absence.findMany({
        where: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          percentage: true,
          status: true,
          reason: true,
          createdAt: true,
        },
        orderBy: [{ startDate: "desc" }],
        take: 30,
      }),
    ]);

    const dayStartHour = tenant?.dayStartHour ?? 7;
    const dayEndHour = tenant?.dayEndHour ?? 15.5;

    return NextResponse.json(
      {
        enabled: tenant?.timeRegistrationEnabled ?? false,
        config: {
          defaultKmRate: tenant?.defaultKmRate ?? 4.5,
          kmAllowanceTaxable: tenant?.kmAllowanceTaxable ?? false,
          lunchBreakMinutes: tenant?.lunchBreakMinutes ?? 30,
          dayStartHour,
          dayEndHour,
          overtime50CapHours: tenant?.overtime50CapHours ?? 4.5,
          saturdayOt50UntilHour: tenant?.saturdayOt50UntilHour ?? 12,
          weeklyHoursNorm: tenant?.weeklyHoursNorm ?? 37.5,
          defaultClockFrom: hoursToClock(dayStartHour),
          defaultClockTo: hoursToClock(dayEndHour),
        },
        projects,
        entries,
        mileageEntries,
        absences,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get mobile time registration error:", error);
    return NextResponse.json({ error: "Kunne ikke hente timeregistrering" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          entryKind?: "DAY" | "TIME" | "MILEAGE" | "ABSENCE";
          projectId?: string;
          date?: string;
          hours?: number;
          timeType?: string;
          clockFrom?: string;
          clockTo?: string;
          lunchMinutes?: number;
          kilometers?: number;
          ratePerKm?: number;
          carKind?: "PRIVATE" | "COMPANY";
          comment?: string;
          absenceType?: string;
          startDate?: string;
          endDate?: string;
          percentage?: number;
          reason?: string;
        }
      | null;

    const entryKind =
      body?.entryKind === "DAY" ||
      body?.entryKind === "MILEAGE" ||
      body?.entryKind === "ABSENCE" ||
      body?.entryKind === "TIME"
        ? body.entryKind
        : "TIME";

    if (entryKind === "ABSENCE") {
      const absenceType =
        typeof body?.absenceType === "string" && absenceTypes.has(body.absenceType)
          ? body.absenceType
          : null;
      const startDate =
        typeof body?.startDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(body.startDate)
          ? body.startDate.slice(0, 10)
          : null;
      const endDate =
        typeof body?.endDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(body.endDate)
          ? body.endDate.slice(0, 10)
          : startDate;
      const percentage =
        typeof body?.percentage === "number" && Number.isFinite(body.percentage)
          ? Math.round(body.percentage)
          : 100;
      const reason = parseComment(body?.reason ?? body?.comment);
      const projectId = body?.projectId?.trim() || undefined;

      if (!absenceType || !startDate || !endDate) {
        return NextResponse.json(
          { error: "Mangler eller ugyldige felter: absenceType, startDate, endDate" },
          { status: 400 },
        );
      }

      const result = await createAbsence({
        type: absenceType as
          | "SELF_CERTIFIED"
          | "SICK_LEAVE"
          | "PARENTAL_LEAVE"
          | "VACATION"
          | "LEAVE_OF_ABSENCE"
          | "COMPENSATORY"
          | "CARE_DAYS"
          | "MILITARY"
          | "BEREAVEMENT"
          | "OTHER",
        startDate,
        endDate,
        percentage,
        reason: reason ?? undefined,
        projectId,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ absence: result.data }, { status: 201 });
    }

    const projectId = body?.projectId?.trim();
    const date = parseDate(body?.date);
    const comment = parseComment(body?.comment);

    if (!projectId || !date) {
      return NextResponse.json(
        { error: "Mangler eller ugyldige felter: projectId, date" },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        timeRegistrationEnabled: true,
        defaultKmRate: true,
      },
    });

    if (!tenant?.timeRegistrationEnabled) {
      return NextResponse.json({ error: "Timeregistrering er ikke aktivert" }, { status: 403 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: session.user.tenantId,
        status: { in: ["ACTIVE", "PLANNING"] },
      },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Prosjekt ikke funnet eller er ikke aktivt" }, { status: 400 });
    }

    const dateIso = body?.date?.slice(0, 10) ?? date.toISOString().slice(0, 10);

    if (entryKind === "DAY") {
      const clockFrom = parseClock(body?.clockFrom);
      const clockTo = parseClock(body?.clockTo);
      const lunchMinutes = parseLunchMinutes(body?.lunchMinutes);
      const kilometers = parseKilometers(body?.kilometers);
      const carKind = parseCarKind(body?.carKind) ?? "COMPANY";

      if (!clockFrom || !clockTo) {
        return NextResponse.json(
          { error: "Mangler eller ugyldige felter: clockFrom, clockTo" },
          { status: 400 },
        );
      }
      if (!comment || comment.length < 2) {
        return NextResponse.json({ error: "Kommentar er pakrevd (minst 2 tegn)" }, { status: 400 });
      }

      const usageLines =
        kilometers && kilometers > 0
          ? [
              {
                kind: "KM" as const,
                productExternalId: "km",
                quantity: kilometers,
                carKind,
                comment: comment,
              },
            ]
          : undefined;

      const result = await submitDayTimesheet({
        date: dateIso,
        clockFrom,
        clockTo,
        lunchMinutes: lunchMinutes ?? undefined,
        projectId,
        comment,
        usageLines,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(
        {
          day: result.data,
        },
        { status: 201 },
      );
    }

    if (entryKind === "MILEAGE") {
      const kilometers = parseKilometers(body?.kilometers);
      const carKind = parseCarKind(body?.carKind) ?? "PRIVATE";
      if (!kilometers) {
        return NextResponse.json(
          { error: "Mangler eller ugyldige felter: kilometers" },
          { status: 400 },
        );
      }

      const usageResult = await addUsageToDay({
        date: dateIso,
        projectId,
        kind: "KM",
        productExternalId: "km",
        quantity: kilometers,
        comment: comment ?? undefined,
        carKind,
      });

      if (usageResult.success) {
        const mileageEntry = await prisma.mileageEntry.findFirst({
          where: {
            tenantId: session.user.tenantId,
            userId: session.user.id,
            projectId,
            date: new Date(`${dateIso}T12:00:00`),
          },
          select: {
            id: true,
            date: true,
            kilometers: true,
            ratePerKm: true,
            amount: true,
            comment: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(
          {
            mileageEntry:
              mileageEntry ??
              ({
                id: usageResult.data.id,
                date: dateIso,
                kilometers,
                ratePerKm: tenant.defaultKmRate ?? 4.5,
                amount: kilometers * (tenant.defaultKmRate ?? 4.5),
                comment,
                createdAt: new Date().toISOString(),
                project: { id: projectId, name: "", code: null },
                carKind,
              } as const),
          },
          { status: 201 },
        );
      }

      // Fallback: fristående km uten eksisterende dag (f.eks. kun kjøring)
      const rate =
        typeof body?.ratePerKm === "number" && Number.isFinite(body.ratePerKm) && body.ratePerKm > 0
          ? body.ratePerKm
          : (tenant.defaultKmRate ?? 4.5);
      const mileageEntry = await prisma.mileageEntry.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          projectId,
          date: new Date(`${dateIso}T12:00:00`),
          kilometers,
          ratePerKm: rate,
          amount: kilometers * rate,
          comment,
        },
        select: {
          id: true,
          date: true,
          kilometers: true,
          ratePerKm: true,
          amount: true,
          comment: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return NextResponse.json({ mileageEntry, warning: usageResult.error }, { status: 201 });
    }

    const hours = parseHours(body?.hours);
    const timeType = parseTimeType(body?.timeType ?? "NORMAL");
    if (!hours || !timeType) {
      return NextResponse.json(
        { error: "Mangler eller ugyldige felter: hours, timeType" },
        { status: 400 },
      );
    }

    const entry = await prisma.timeEntry.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        projectId,
        date: new Date(`${dateIso}T12:00:00`),
        hours,
        timeType,
        comment,
        approvalStatus: "SUBMITTED",
      },
      select: {
        id: true,
        date: true,
        hours: true,
        timeType: true,
        comment: true,
        clockFrom: true,
        clockTo: true,
        lunchMinutes: true,
        approvalStatus: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Create mobile time entry error:", error);
    return NextResponse.json({ error: "Kunne ikke registrere timer" }, { status: 500 });
  }
}
