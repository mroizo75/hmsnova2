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

/** Åpent avvik på tavlen. Uten beskrivelse og uten navn på involverte. */
export interface TavleAvvikItem {
  id: string;
  reference: string | null;
  title: string;
  severity: number | null;
  type: string;
}

/** Valgt risikovurdering, IK-HMS § 5 nr. 6. Kun titler og score, ikke eier. */
export interface TavleRisikoData {
  id: string;
  title: string;
  year: number;
  open: number;
  high: number;
  items: Array<{ title: string; score: number }>;
}

export interface TavleSectionRef {
  type: string;
  config: unknown;
}

export interface TavleLiveData {
  sja: TavleSjaItem[];
  vernerunde: TavleVernerundeData | null;
  opplaring: TavleOpplaringData | null;
  aarshjul: TavleAarshjulData | null;
  kpi: TavleKpiData | null;
  avvik: TavleAvvikItem[];
  risiko: TavleRisikoData | null;
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
function configRecord(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

export async function getTavleLiveData(params: {
  tenantId: string;
  projectId: string | null;
  sections: ReadonlyArray<TavleSectionRef>;
}): Promise<TavleLiveData> {
  const { tenantId, projectId, sections } = params;
  const trengs = new Set(sections.map((section) => section.type));
  const tomt: TavleLiveData = {
    sja: [],
    vernerunde: null,
    opplaring: null,
    aarshjul: null,
    kpi: null,
    avvik: [],
    risiko: null,
  };

  const now = new Date();
  const trengerKpi =
    trengs.has("KPI_DASHBOARD") || trengs.has("AVVIK_STATISTIKK") || trengs.has("RUH_LISTE");
  const trengerAvvik = trengs.has("AVVIK_STATISTIKK") || trengs.has("RUH_LISTE");
  const risikoSeksjon = sections.find((section) => section.type === "RISIKOMATRISE");
  const riskAssessmentId = risikoSeksjon
    ? configRecord(risikoSeksjon.config).riskAssessmentId
    : null;

  const [sja, vernerunde, opplaring, aarshjul, kpi, avvik, risiko] = await Promise.all([
    trengs.has("SJA_AKTIVE") ? hentSja(tenantId, projectId) : Promise.resolve(tomt.sja),
    trengs.has("VERNERUNDE_STATUS")
      ? hentVernerunde(tenantId, projectId, now)
      : Promise.resolve(null),
    trengs.has("OPPLARING_STATUS") ? hentOpplaring(tenantId, now) : Promise.resolve(null),
    trengs.has("HMS_PLAN_AARSHJUL") ? hentAarshjul(tenantId, now) : Promise.resolve(null),
    trengerKpi ? hentKpi(tenantId, projectId, now) : Promise.resolve(null),
    trengerAvvik ? hentAvvik(tenantId, projectId) : Promise.resolve(tomt.avvik),
    trengs.has("RISIKOMATRISE") && typeof riskAssessmentId === "string"
      ? hentRisiko(tenantId, projectId, riskAssessmentId)
      : Promise.resolve(null),
  ]);

  return { sja, vernerunde, opplaring, aarshjul, kpi, avvik, risiko };
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
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { industry: true },
  });
  const industry = (tenant?.industry ?? "").trim().toLowerCase();
  const applicableSteps = ANNUAL_HMS_PLAN_STEPS.filter(
    (step) => !step.industries || step.industries.includes(industry)
  );
  const completed = await prisma.hmsAnnualPlanCompletion.count({
    where: {
      tenantId,
      year,
      status: "COMPLETED",
      stepKey: { in: applicableSteps.map((step) => step.key) },
    },
  });

  return { year, completed, total: applicableSteps.length };
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

async function hentAvvik(tenantId: string, projectId: string | null): Promise<TavleAvvikItem[]> {
  const rader = await prisma.incident.findMany({
    where: {
      tenantId,
      ...(projectId ? { projectId } : {}),
      status: { not: "CLOSED" },
    },
    orderBy: [{ severity: "desc" }, { occurredAt: "desc" }],
    take: 8,
    select: {
      id: true,
      avviksnummer: true,
      title: true,
      severity: true,
      type: true,
    },
  });

  return rader.map((rad) => ({
    id: rad.id,
    reference: rad.avviksnummer,
    title: rad.title,
    severity: rad.severity,
    type: rad.type,
  }));
}

async function hentRisiko(
  tenantId: string,
  projectId: string | null,
  riskAssessmentId: string
): Promise<TavleRisikoData | null> {
  const vurdering = await prisma.riskAssessment.findFirst({
    where: {
      id: riskAssessmentId,
      tenantId,
      ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
    },
    select: {
      id: true,
      title: true,
      assessmentYear: true,
      risks: {
        where: { status: { not: "CLOSED" } },
        orderBy: { score: "desc" },
        take: 8,
        select: { title: true, score: true },
      },
    },
  });

  if (!vurdering) return null;

  const open = await prisma.risk.count({
    where: { tenantId, riskAssessmentId: vurdering.id, status: { not: "CLOSED" } },
  });
  const high = await prisma.risk.count({
    where: {
      tenantId,
      riskAssessmentId: vurdering.id,
      status: { not: "CLOSED" },
      score: { gte: 10 },
    },
  });

  return {
    id: vurdering.id,
    title: vurdering.title,
    year: vurdering.assessmentYear,
    open,
    high,
    items: vurdering.risks.map((risk) => ({ title: risk.title, score: risk.score })),
  };
}
