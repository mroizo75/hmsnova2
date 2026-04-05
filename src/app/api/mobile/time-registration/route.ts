import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TimeEntryType } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const [tenant, projects, entries, mileageEntries] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
          id: true,
          timeRegistrationEnabled: true,
        },
      }),
      prisma.project.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: "ACTIVE",
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
    ]);

    return NextResponse.json(
      {
        enabled: tenant?.timeRegistrationEnabled ?? false,
        projects,
        entries,
        mileageEntries,
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
          entryKind?: "TIME" | "MILEAGE";
          projectId?: string;
          date?: string;
          hours?: number;
          timeType?: string;
          kilometers?: number;
          ratePerKm?: number;
          comment?: string;
        }
      | null;
    const entryKind = body?.entryKind === "MILEAGE" ? "MILEAGE" : "TIME";
    const projectId = body?.projectId?.trim();
    const date = parseDate(body?.date);
    const hours = parseHours(body?.hours);
    const timeType = parseTimeType(body?.timeType ?? "NORMAL");
    const kilometers = parseKilometers(body?.kilometers);
    const ratePerKm =
      typeof body?.ratePerKm === "number" && Number.isFinite(body.ratePerKm) && body.ratePerKm > 0
        ? body.ratePerKm
        : null;
    const comment = parseComment(body?.comment);

    if (!projectId || !date) {
      return NextResponse.json(
        { error: "Mangler eller ugyldige felter: projectId, date" },
        { status: 400 },
      );
    }
    if (entryKind === "TIME" && (!hours || !timeType)) {
      return NextResponse.json(
        { error: "Mangler eller ugyldige felter: hours, timeType" },
        { status: 400 },
      );
    }
    if (entryKind === "MILEAGE" && !kilometers) {
      return NextResponse.json(
        { error: "Mangler eller ugyldige felter: kilometers" },
        { status: 400 },
      );
    }

    const [tenant, project] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
          timeRegistrationEnabled: true,
        },
      }),
      prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: session.user.tenantId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!tenant?.timeRegistrationEnabled) {
      return NextResponse.json({ error: "Timeregistrering er ikke aktivert" }, { status: 403 });
    }
    if (!project) {
      return NextResponse.json({ error: "Prosjekt ikke funnet eller er ikke aktivt" }, { status: 400 });
    }

    if (entryKind === "MILEAGE") {
      const tenantConfig = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { defaultKmRate: true },
      });
      const rate = ratePerKm ?? tenantConfig?.defaultKmRate ?? 4.5;
      const mileageEntry = await prisma.mileageEntry.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          projectId,
          date,
          kilometers: kilometers!,
          ratePerKm: rate,
          amount: kilometers! * rate,
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

      return NextResponse.json({ mileageEntry }, { status: 201 });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        projectId,
        date,
        hours: hours!,
        timeType: timeType!,
        comment,
      },
      select: {
        id: true,
        date: true,
        hours: true,
        timeType: true,
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

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Create mobile time entry error:", error);
    return NextResponse.json({ error: "Kunne ikke registrere timer" }, { status: 500 });
  }
}
