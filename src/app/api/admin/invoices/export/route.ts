import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true, isSupport: true },
  });

  if (!user || !user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const label = searchParams.get("label") || "egendefinert";

  if (!from || !to) {
    return NextResponse.json({ error: "Mangler 'from' og 'to' parametere" }, { status: 400 });
  }

  const periodStart = new Date(from);
  const periodEnd = new Date(to);
  periodEnd.setHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      dueDate: { gte: periodStart, lte: periodEnd },
      status: { not: "CANCELLED" },
    },
    include: {
      tenant: {
        select: {
          name: true,
          orgNumber: true,
          invoiceEmail: true,
          contactEmail: true,
          invoiceAddress: true,
          invoicePostalCode: true,
          invoiceCity: true,
          useEHF: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { tenant: { name: "asc" } }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Fakturaer");

  sheet.columns = [
    { header: "Fakturanr", key: "invoiceNumber", width: 14 },
    { header: "Bedrift", key: "tenantName", width: 30 },
    { header: "Org.nr", key: "orgNumber", width: 14 },
    { header: "E-post (faktura)", key: "invoiceEmail", width: 28 },
    { header: "Adresse", key: "address", width: 30 },
    { header: "Postnr", key: "postalCode", width: 8 },
    { header: "Poststed", key: "city", width: 15 },
    { header: "EHF", key: "useEHF", width: 6 },
    { header: "Beskrivelse", key: "description", width: 40 },
    { header: "Beløp eks. mva", key: "amountExMva", width: 16 },
    { header: "MVA (25%)", key: "mva", width: 12 },
    { header: "Totalbeløp", key: "amount", width: 14 },
    { header: "Forfallsdato", key: "dueDate", width: 13 },
    { header: "Periode", key: "period", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Betalt dato", key: "paidDate", width: 13 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E79" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  const statusLabels: Record<string, string> = {
    PENDING: "Ikke sendt",
    SENT: "Sendt",
    PAID: "Betalt",
    OVERDUE: "Forfalt",
    CANCELLED: "Kansellert",
  };

  for (const inv of invoices) {
    const amountExMva = Math.round((inv.amount / 1.25) * 100) / 100;
    const mva = Math.round((inv.amount - amountExMva) * 100) / 100;

    sheet.addRow({
      invoiceNumber: inv.invoiceNumber || "",
      tenantName: inv.tenant.name,
      orgNumber: inv.tenant.orgNumber || "",
      invoiceEmail: inv.tenant.invoiceEmail || inv.tenant.contactEmail || "",
      address: inv.tenant.invoiceAddress || "",
      postalCode: inv.tenant.invoicePostalCode || "",
      city: inv.tenant.invoiceCity || "",
      useEHF: inv.tenant.useEHF ? "Ja" : "Nei",
      description: inv.description || "",
      amountExMva,
      mva,
      amount: inv.amount,
      dueDate: new Date(inv.dueDate).toLocaleDateString("no-NO"),
      period: inv.period || "",
      status: statusLabels[inv.status] || inv.status,
      paidDate: inv.paidDate ? new Date(inv.paidDate).toLocaleDateString("no-NO") : "",
    });
  }

  const totalRow = sheet.addRow({
    invoiceNumber: "",
    tenantName: "",
    orgNumber: "",
    invoiceEmail: "",
    address: "",
    postalCode: "",
    city: "",
    useEHF: "",
    description: "TOTAL",
    amountExMva: invoices.reduce((s, i) => s + Math.round((i.amount / 1.25) * 100) / 100, 0),
    mva: invoices.reduce((s, i) => s + Math.round((i.amount - i.amount / 1.25) * 100) / 100, 0),
    amount: invoices.reduce((s, i) => s + i.amount, 0),
    dueDate: "",
    period: "",
    status: "",
    paidDate: "",
  });
  totalRow.font = { bold: true };

  await prisma.invoiceExport.create({
    data: {
      exportedById: user.id,
      periodLabel: label,
      periodStart,
      periodEnd,
      invoiceCount: invoices.length,
      totalAmount: invoices.reduce((s, i) => s + i.amount, 0),
      fileName: `fakturaer-${label}.xlsx`,
      invoiceIds: JSON.stringify(invoices.map((i) => i.id)),
    },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `HMS-Nova-fakturaer-${label}-${from}-${to}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
