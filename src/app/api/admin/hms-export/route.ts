import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";

import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SUPPORTED_INDUSTRIES } from "@/lib/industry-packages";

export async function GET() {
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

  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { id: true, name: true, orgNumber: true, industry: true, status: true },
    orderBy: { name: "asc" },
  });

  const tenantIds = tenants.map((t) => t.id);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  type CountRow = { tenantId: string; cnt: bigint };

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

  const toMap = (rows: CountRow[]) =>
    new Map(rows.map((r) => [r.tenantId, Number(r.cnt)]));

  const incMap = toMap(incidentsByTenant);
  const riskMap = toMap(risksByTenant);
  const inspMap = toMap(inspectionsByTenant);
  const trainMap = toMap(trainingsByTenant);
  const measDoneMap = toMap(measuresCompleted);
  const measPendMap = toMap(measuresPending);

  const industryLabel = (val: string | null) => {
    if (!val) return "";
    return SUPPORTED_INDUSTRIES.find((i) => i.value === val)?.label || val;
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("NHO HMS-rapport");

  sheet.columns = [
    { header: "Bedrift", key: "name", width: 30 },
    { header: "Org.nr", key: "orgNumber", width: 15 },
    { header: "Bransje", key: "industry", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Avvik (90d)", key: "incidents", width: 14 },
    { header: "Risikovurderinger", key: "risks", width: 18 },
    { header: "Vernerunder", key: "inspections", width: 14 },
    { header: "Opplæring", key: "trainings", width: 12 },
    { header: "Tiltak fullført", key: "measuresCompleted", width: 16 },
    { header: "Tiltak ventende", key: "measuresPending", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FE" },
  };

  for (const tenant of tenants) {
    sheet.addRow({
      name: tenant.name,
      orgNumber: tenant.orgNumber || "",
      industry: industryLabel(tenant.industry),
      status: tenant.status,
      incidents: incMap.get(tenant.id) || 0,
      risks: riskMap.get(tenant.id) || 0,
      inspections: inspMap.get(tenant.id) || 0,
      trainings: trainMap.get(tenant.id) || 0,
      measuresCompleted: measDoneMap.get(tenant.id) || 0,
      measuresPending: measPendMap.get(tenant.id) || 0,
    });
  }

  const summarySheet = workbook.addWorksheet("Oppsummering");
  summarySheet.columns = [
    { header: "Nøkkeltall", key: "label", width: 30 },
    { header: "Verdi", key: "value", width: 20 },
  ];
  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true };

  const totalIncidents = tenants.reduce((s, t) => s + (incMap.get(t.id) || 0), 0);
  const totalMeasDone = tenants.reduce((s, t) => s + (measDoneMap.get(t.id) || 0), 0);
  const totalMeasPend = tenants.reduce((s, t) => s + (measPendMap.get(t.id) || 0), 0);

  summarySheet.addRow({ label: "Rapport generert", value: new Date().toLocaleDateString("nb-NO") });
  summarySheet.addRow({ label: "Antall aktive bedrifter", value: tenants.length });
  summarySheet.addRow({ label: "Avvik siste 90 dager (totalt)", value: totalIncidents });
  summarySheet.addRow({ label: "Tiltak fullført (totalt)", value: totalMeasDone });
  summarySheet.addRow({ label: "Tiltak ventende (totalt)", value: totalMeasPend });
  summarySheet.addRow({
    label: "Fullføringsrate tiltak",
    value: totalMeasDone + totalMeasPend > 0
      ? `${Math.round((totalMeasDone / (totalMeasDone + totalMeasPend)) * 100)}%`
      : "N/A",
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const now = new Date();
  const filename = `NHO_HMS_rapport_${now.getFullYear()}_Q${Math.ceil((now.getMonth() + 1) / 3)}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
