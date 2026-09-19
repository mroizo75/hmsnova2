import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildAssociationReport,
  DEFAULT_NHO_ASSOCIATION_ID,
  getAssociationIndustryValues,
  getNhoAssociation,
  measureCompletionRate,
  type TenantHmsMetrics,
} from "@/lib/nho-associations";

type CountRow = { tenantId: string; cnt: bigint };

function toMap(rows: CountRow[]) {
  return new Map(rows.map((r) => [r.tenantId, Number(r.cnt)]));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const associationId =
    new URL(request.url).searchParams.get("association") ?? DEFAULT_NHO_ASSOCIATION_ID;
  const association = getNhoAssociation(associationId);
  if (!association) {
    return NextResponse.json(
      { code: "unknown_association", message: "Ukjent forening" },
      { status: 400 },
    );
  }

  const industryValues = getAssociationIndustryValues(association);

  const optedOut = await prisma.intelligenceConsent.findMany({
    where: { optedIn: false },
    select: { tenantId: true },
  });
  const excludeIds = optedOut.map((row) => row.tenantId);

  const tenants = await prisma.tenant.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      industry: { in: industryValues },
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { id: true, industry: true },
  });

  const tenantIds = tenants.map((t) => t.id);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  let incMap = new Map<string, number>();
  let riskMap = new Map<string, number>();
  let inspMap = new Map<string, number>();
  let trainMap = new Map<string, number>();
  let measDoneMap = new Map<string, number>();
  let measPendMap = new Map<string, number>();

  if (tenantIds.length > 0) {
    const [
      incidentsByTenant,
      risksByTenant,
      inspectionsByTenant,
      trainingsByTenant,
      measuresCompleted,
      measuresPending,
    ] = await Promise.all([
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM Incident
        WHERE tenantId IN (${Prisma.join(tenantIds)}) AND createdAt >= ${ninetyDaysAgo}
        GROUP BY tenantId
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM RiskAssessment
        WHERE tenantId IN (${Prisma.join(tenantIds)})
        GROUP BY tenantId
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM Inspection
        WHERE tenantId IN (${Prisma.join(tenantIds)})
        GROUP BY tenantId
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM Training
        WHERE tenantId IN (${Prisma.join(tenantIds)})
        GROUP BY tenantId
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM Measure
        WHERE tenantId IN (${Prisma.join(tenantIds)}) AND status = 'DONE'
        GROUP BY tenantId
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT tenantId, COUNT(*) as cnt FROM Measure
        WHERE tenantId IN (${Prisma.join(tenantIds)}) AND status IN ('PENDING', 'IN_PROGRESS')
        GROUP BY tenantId
      `,
    ]);

    incMap = toMap(incidentsByTenant);
    riskMap = toMap(risksByTenant);
    inspMap = toMap(inspectionsByTenant);
    trainMap = toMap(trainingsByTenant);
    measDoneMap = toMap(measuresCompleted);
    measPendMap = toMap(measuresPending);
  }

  const metricRows: TenantHmsMetrics[] = tenants.map((tenant) => ({
    industry: tenant.industry,
    incidents90d: incMap.get(tenant.id) || 0,
    risks: riskMap.get(tenant.id) || 0,
    inspections: inspMap.get(tenant.id) || 0,
    trainings: trainMap.get(tenant.id) || 0,
    measuresCompleted: measDoneMap.get(tenant.id) || 0,
    measuresPending: measPendMap.get(tenant.id) || 0,
  }));

  const report = buildAssociationReport(metricRows, association);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const about = workbook.addWorksheet("Om rapporten");
  about.columns = [
    { header: "Felt", key: "label", width: 36 },
    { header: "Verdi", key: "value", width: 80 },
  ];
  about.getRow(1).font = { bold: true };
  about.addRow({ label: "Mottaker", value: association.label });
  about.addRow({ label: "Rapporttype", value: "Anonymisert bransjestatistikk" });
  about.addRow({
    label: "Inneholder ikke",
    value: "Bedriftsnavn, organisasjonsnummer eller andre identifiserende opplysninger",
  });
  about.addRow({
    label: "Bransjer i utvalget",
    value: association.industries.map((group) => group.label).join("; "),
  });
  about.addRow({
    label: "Hjemmel",
    value:
      "GDPR fortale 26 og personvernerklæringen pkt. 3b. Aggregerte tall med k-anonymitet (minimum 5 bedrifter per gruppe).",
  });
  about.addRow({
    label: "Reservasjon",
    value: "Bedrifter som har reservert seg mot bransjestatistikk er utelatt.",
  });
  about.addRow({
    label: "Rapport generert",
    value: new Date().toLocaleString("nb-NO"),
  });

  const summary = workbook.addWorksheet("Oppsummering");
  summary.columns = [
    { header: "Nøkkeltall", key: "label", width: 40 },
    { header: "Verdi", key: "value", width: 24 },
  ];
  summary.getRow(1).font = { bold: true };

  if (report.belowThreshold || !report.totals) {
    summary.addRow({
      label: "Status",
      value: `For få bedrifter til å vise tall (k-anonymitet, minimum ${report.kAnonymity} bedrifter).`,
    });
  } else {
    summary.addRow({ label: "Forening", value: association.label });
    summary.addRow({ label: "Antall bedrifter i utvalget", value: report.totals.tenantCount });
    summary.addRow({ label: "Avvik siste 90 dager", value: report.totals.incidents90d });
    summary.addRow({ label: "Risikovurderinger", value: report.totals.risks });
    summary.addRow({ label: "Vernerunder", value: report.totals.inspections });
    summary.addRow({ label: "Opplæring", value: report.totals.trainings });
    summary.addRow({ label: "Tiltak fullført", value: report.totals.measuresCompleted });
    summary.addRow({ label: "Tiltak ventende", value: report.totals.measuresPending });
    summary.addRow({ label: "Fullføringsrate tiltak", value: measureCompletionRate(report.totals) });
  }

  const industrySheet = workbook.addWorksheet("Per bransje");
  industrySheet.columns = [
    { header: "Bransje", key: "label", width: 36 },
    { header: "Bedrifter", key: "tenantCount", width: 14 },
    { header: "Avvik (90d)", key: "incidents90d", width: 14 },
    { header: "Risikovurderinger", key: "risks", width: 18 },
    { header: "Vernerunder", key: "inspections", width: 14 },
    { header: "Opplæring", key: "trainings", width: 12 },
    { header: "Tiltak fullført", key: "measuresCompleted", width: 16 },
    { header: "Tiltak ventende", key: "measuresPending", width: 16 },
  ];
  industrySheet.getRow(1).font = { bold: true };
  industrySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FE" },
  };

  if (report.byIndustry.length === 0) {
    industrySheet.addRow({
      label: report.belowThreshold
        ? "Ingen bransjenedbrytning – utvalget er under terskel"
        : "Ingen enkeltbransje har minst 5 bedrifter. Se oppsummering for samletall.",
    });
  } else {
    for (const row of report.byIndustry) {
      industrySheet.addRow({
        label: row.label,
        tenantCount: row.tenantCount,
        incidents90d: row.incidents90d,
        risks: row.risks,
        inspections: row.inspections,
        trainings: row.trainings,
        measuresCompleted: row.measuresCompleted,
        measuresPending: row.measuresPending,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const now = new Date();
  const filename = `${association.filenamePrefix}_${now.getFullYear()}_Q${Math.ceil((now.getMonth() + 1) / 3)}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
