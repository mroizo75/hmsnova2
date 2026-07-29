/**
 * Live HMS Nova-data til seksjonene på Digital HMS Tavle.
 *
 * Gjelder kun tavler på ADDON-plan som er koblet til et prosjekt. Tavlen er
 * offentlig, så her hentes bare det som skal kunne stå på en vegg: statuser,
 * antall og titler på planlagt arbeid. Aldri personopplysninger utover navn på
 * ansvarlig, og aldri innhold i avvik eller funn.
 *
 * Byggherreforskriften § 19 krever at arbeidstakere og verneombud får informasjon
 * om tiltakene for sikkerhet, helse og arbeidsmiljø. Seksjonene her er den
 * informasjonsflaten.
 */

import { prisma } from "@/lib/db";
import { ANNUAL_HMS_PLAN_STEPS } from "@/lib/annual-hms-plan-steps";

export interface TavleSjaItem {
  id: string;
  title: string;
  workLocation: string;
  responsibleName: string;
  plannedDate: string;
}

export interface TavleVernerundeData {
  lastCompletedAt: string | null;
  nextPlannedAt: string | null;
  openFindings: number;
  completedLast12Months: number;
}

export interface TavleOpplaringData {
  totalRegistered: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

export interface TavleAarshjulData {
  year: number;
  completed: number;
  total: number;
}

export interface TavleKpiData {
  openIncidents: number;
  criticalIncidents: number;
  closedThisMonth: number;
  openMeasures: number;
  daysSinceLastIncident: number | null;
}

export interface TavleLiveData {
  sja: TavleSjaItem[];
  vernerunde: TavleVernerundeData | null;
  opplaring: TavleOpplaringData | null;
  aarshjul: TavleAarshjulData | null;
  kpi: TavleKpiData | null;
}

/** Antall dager framover et gyldighetsbevis regnes som «utløper snart». */
const EXPIRING_SOON_DAYS = 60;

const VERNERUNDE_TYPES = ["VERNERUNDE", "SIKKERHETSVANDRING"] as const;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Henter live-data for seksjonstypene som trenger det. Returnerer tomt objekt
 * for standalone-tavler, som i stedet viser manuelt registrerte tall.
 */
export async function getTavleLiveData(params: {
  tenantId: string;
  projectId: string | null;
  sectionTypes: ReadonlyArray<string>;
}): Promise<TavleLiveData> {
  const { tenantId, projectId, sectionTypes } = params;
  const trengs = new Set(sectionTypes);
  const tomt: TavleLiveData = {
    sja: [],
    vernerunde: null,
    opplaring: null,
    aarshjul: null,
    kpi: null,
  };

  const now = new Date();

  const [sja, vernerunde, opplaring, aarshjul, kpi] = await Promise.all([
    trengs.has("SJA_AKTIVE") ? hentSja(tenantId, projectId) : Promise.resolve(tomt.sja),
    trengs.has("VERNERUNDE_STATUS")
      ? hentVernerunde(tenantId, projectId, now)
      : Promise.resolve(null),
    trengs.has("OPPLARING_STATUS") ? hentOpplaring(tenantId, now) : Promise.resolve(null),
    trengs.has("HMS_PLAN_AARSHJUL") ? hentAarshjul(tenantId, now) : Promise.resolve(null),
    trengs.has("KPI_DASHBOARD") ? hentKpi(tenantId, projectId, now) : Promise.resolve(null),
  ]);

  return { sja, vernerunde, opplaring, aarshjul, kpi };
}

async function hentSja(tenantId: string, projectId: string | null): Promise<TavleSjaItem[]> {
  const rader = await prisma.sjaAnalysis.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { plannedDate: "asc" },
    take: 6,
    select: {
      id: true,
      title: true,
      workLocation: true,
      responsibleName: true,
      plannedDate: true,
    },
  });

  return rader.map((rad) => ({
    id: rad.id,
    title: rad.title,
    workLocation: rad.workLocation,
    responsibleName: rad.responsibleName,
    plannedDate: rad.plannedDate.toISOString(),
  }));
}

async function hentVernerunde(
  tenantId: string,
  projectId: string | null,
  now: Date
): Promise<TavleVernerundeData> {
  const tolvManederSiden = new Date(now);
  tolvManederSiden.setMonth(tolvManederSiden.getMonth() - 12);

  const basis = {
    tenantId,
    type: { in: [...VERNERUNDE_TYPES] },
    ...(projectId ? { projectId } : {}),
  };

  const [siste, neste, apneFunn, fullforte] = await Promise.all([
    prisma.inspection.findFirst({
      where: { ...basis, status: "COMPLETED" },
      orderBy: { completedDate: "desc" },
      select: { completedDate: true },
    }),
    prisma.inspection.findFirst({
      where: { ...basis, status: { in: ["PLANNED", "IN_PROGRESS"] }, scheduledDate: { gte: now } },
      orderBy: { scheduledDate: "asc" },
      select: { scheduledDate: true },
    }),
    prisma.inspectionFinding.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        inspection: basis,
      },
    }),
    prisma.inspection.count({
      where: { ...basis, status: "COMPLETED", completedDate: { gte: tolvManederSiden } },
    }),
  ]);

  return {
    lastCompletedAt: toIso(siste?.completedDate),
    nextPlannedAt: toIso(neste?.scheduledDate),
    openFindings: apneFunn,
    completedLast12Months: fullforte,
  };
}

async function hentOpplaring(tenantId: string, now: Date): Promise<TavleOpplaringData> {
  const snartUtlopt = new Date(now);
  snartUtlopt.setDate(snartUtlopt.getDate() + EXPIRING_SOON_DAYS);

  const [totalRegistered, expired, expiringSoon] = await Promise.all([
    prisma.training.count({ where: { tenantId, completedAt: { not: null } } }),
    prisma.training.count({
      where: { tenantId, completedAt: { not: null }, validUntil: { lt: now } },
    }),
    prisma.training.count({
      where: {
        tenantId,
        completedAt: { not: null },
        validUntil: { gte: now, lte: snartUtlopt },
      },
    }),
  ]);

  return {
    totalRegistered,
    valid: Math.max(totalRegistered - expired, 0),
    expiringSoon,
    expired,
  };
}

async function hentAarshjul(tenantId: string, now: Date): Promise<TavleAarshjulData> {
  const year = now.getFullYear();
  const completed = await prisma.hmsAnnualPlanCompletion.count({
    where: { tenantId, year },
  });

  return { year, completed, total: ANNUAL_HMS_PLAN_STEPS.length };
}

async function hentKpi(
  tenantId: string,
  projectId: string | null,
  now: Date
): Promise<TavleKpiData> {
  const manedStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prosjektFilter = projectId ? { projectId } : {};

  const [openIncidents, criticalIncidents, closedThisMonth, openMeasures, sisteHendelse] =
    await Promise.all([
      prisma.incident.count({
        where: { tenantId, ...prosjektFilter, status: { not: "CLOSED" } },
      }),
      // Alvorlighetsgrad er 1–5. Fire og fem regnes som kritisk.
      // Avvik uten satt grad (null) telles ikke som kritiske før leder har vurdert dem.
      prisma.incident.count({
        where: { tenantId, ...prosjektFilter, status: { not: "CLOSED" }, severity: { gte: 4 } },
      }),
      prisma.incident.count({
        where: { tenantId, ...prosjektFilter, status: "CLOSED", closedAt: { gte: manedStart } },
      }),
      prisma.measure.count({ where: { tenantId, status: { not: "DONE" } } }),
      prisma.incident.findFirst({
        where: { tenantId, ...prosjektFilter },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
    ]);

  const daysSinceLastIncident = sisteHendelse
    ? Math.max(
        Math.floor((now.getTime() - sisteHendelse.occurredAt.getTime()) / 86_400_000),
        0
      )
    : null;

  return {
    openIncidents,
    criticalIncidents,
    closedThisMonth,
    openMeasures,
    daysSinceLastIncident,
  };
}
