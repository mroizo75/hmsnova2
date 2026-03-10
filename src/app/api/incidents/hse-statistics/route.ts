import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface YearStats {
  year: number;
  manHours: number;
  fatalities: number;
  lostTimeIncidents: number;
  lostWorkdays: number;
  restrictedWorkCases: number;
  medicalTreatmentCases: number;
  totalRecordable: number;
  trir: number | null;
}

function calcTrir(totalRecordable: number, manHours: number): number | null {
  if (manHours <= 0) return null;
  // TRIR = (Recordable cases × 200 000) / Man Hours
  return Math.round(((totalRecordable * 200000) / manHours) * 100) / 100;
}

// GET /api/incidents/hse-statistics?years=3
// Returnerer HSE-statistikk for de siste N år inkl. inneværende år
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen tenant" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const yearsBack = Math.min(parseInt(searchParams.get("years") ?? "3", 10), 10);
    const currentYear = new Date().getFullYear();

    const yearStats: YearStats[] = [];

    for (let i = yearsBack - 1; i >= 0; i--) {
      const year = currentYear - i;
      const from = new Date(`${year}-01-01T00:00:00.000Z`);
      const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

      // Hent alle relevante hendelser for dette året
      const incidents = await prisma.incident.findMany({
        where: {
          tenantId,
          occurredAt: { gte: from, lt: to },
          type: { in: ["ULYKKE", "NESTEN", "YRKESSYKDOM"] },
        },
        select: {
          isFatal: true,
          isLostTimeIncident: true,
          lostWorkdays: true,
          isRestrictedWork: true,
          medicalAttentionRequired: true,
        },
      });

      // Hent arbeidede timer fra timeregistrering for samme år
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          tenantId,
          date: { gte: from, lt: to },
        },
        select: { hours: true },
      });

      const manHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);

      const fatalities = incidents.filter((i) => i.isFatal).length;
      const lostTimeIncidents = incidents.filter((i) => i.isLostTimeIncident).length;
      const lostWorkdays = incidents.reduce(
        (sum, i) => sum + (i.lostWorkdays ?? 0),
        0
      );
      const restrictedWorkCases = incidents.filter(
        (i) => i.isRestrictedWork
      ).length;
      const medicalTreatmentCases = incidents.filter(
        (i) => i.medicalAttentionRequired
      ).length;

      // TRIR = Fatalities + LTI + Restricted + Medical treatment
      const totalRecordable =
        fatalities + lostTimeIncidents + restrictedWorkCases + medicalTreatmentCases;

      yearStats.push({
        year,
        manHours: Math.round(manHours * 10) / 10,
        fatalities,
        lostTimeIncidents,
        lostWorkdays,
        restrictedWorkCases,
        medicalTreatmentCases,
        totalRecordable,
        trir: calcTrir(totalRecordable, manHours),
      });
    }

    // Kompiler totaler på tvers av alle år for sammendrag
    const totals = yearStats.reduce(
      (acc, y) => ({
        manHours: acc.manHours + y.manHours,
        fatalities: acc.fatalities + y.fatalities,
        lostTimeIncidents: acc.lostTimeIncidents + y.lostTimeIncidents,
        lostWorkdays: acc.lostWorkdays + y.lostWorkdays,
        restrictedWorkCases: acc.restrictedWorkCases + y.restrictedWorkCases,
        medicalTreatmentCases:
          acc.medicalTreatmentCases + y.medicalTreatmentCases,
        totalRecordable: acc.totalRecordable + y.totalRecordable,
      }),
      {
        manHours: 0,
        fatalities: 0,
        lostTimeIncidents: 0,
        lostWorkdays: 0,
        restrictedWorkCases: 0,
        medicalTreatmentCases: 0,
        totalRecordable: 0,
      }
    );

    return NextResponse.json({
      years: yearStats,
      totals: {
        ...totals,
        trir: calcTrir(totals.totalRecordable, totals.manHours),
      },
      manHoursFromTimeRegistration: timeEntriesExist(yearStats),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil" },
      { status: 500 }
    );
  }
}

function timeEntriesExist(years: YearStats[]): boolean {
  return years.some((y) => y.manHours > 0);
}
