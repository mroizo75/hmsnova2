import { format } from "date-fns";
import { nb } from "date-fns/locale";
import ExcelJS from "exceljs";

const TIME_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ordinær",
  OVERTIME_50: "Overtid 50 %",
  OVERTIME_40: "Overtid 40 %",
  OVERTIME_100: "Overtid 100 %",
  WEEKEND: "Helg/helligdag",
  TRAVEL: "Reise/kjøring",
  SICK_LEAVE: "Sykefravær",
};

export interface TimeEntryForReport {
  id: string;
  date: Date;
  hours: number;
  timeType: string;
  comment: string | null;
  project: { name: string; code: string | null };
  user: { id: string; name: string | null; email: string };
  editedBy: { name: string | null } | null;
}

export interface MileageEntryForReport {
  id: string;
  date: Date;
  kilometers: number;
  ratePerKm: number | null;
  amount: number | null;
  comment: string | null;
  project: { name: string; code: string | null };
  user: { id: string; name: string | null; email: string };
  editedBy: { name: string | null } | null;
}

/** Trekkfri sats pr km (Skatteetaten 2024–2026). Beløp over dette er skattepliktig. */
const TREKKFRI_KM_SATS = 3.5;

export interface TimeRegistrationReportConfig {
  defaultHourlyRate: number | null;
  approximateTaxPercent: number | null;
  defaultKmRate: number | null;
  kmAllowanceTaxable: boolean;
  overtime40Multiplier: number;
  overtime50Multiplier: number;
  overtime100Multiplier: number;
}

export interface TimeRegistrationReportData {
  tenantName: string;
  dateRange: { from: Date; to: Date };
  timeEntries: TimeEntryForReport[];
  mileageEntries: MileageEntryForReport[];
  userDisplayNames: Record<string, string>;
  config?: TimeRegistrationReportConfig | null;
}

export async function generateTimeRegistrationExcel(
  data: TimeRegistrationReportData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";

  const {
    tenantName,
    dateRange,
    timeEntries,
    mileageEntries,
    userDisplayNames,
    config,
  } = data;

  const dateRangeStr = `${format(dateRange.from, "d.M.yyyy", { locale: nb })} – ${format(dateRange.to, "d.M.yyyy", { locale: nb })}`;

  // Sheet 1: Timer
  const timeSheet = workbook.addWorksheet("Timer", {
    headerFooter: {
      firstHeader: `${tenantName} – Timeregistrering`,
      firstFooter: `Generert ${format(new Date(), "d. MMMM yyyy", { locale: nb })}`,
    },
  });

  timeSheet.columns = [
    { header: "Navn", key: "name", width: 22 },
    { header: "Dato", key: "date", width: 12 },
    { header: "Prosjekt", key: "project", width: 25 },
    { header: "Kode", key: "code", width: 12 },
    { header: "Timer", key: "hours", width: 8 },
    { header: "Type", key: "type", width: 14 },
    { header: "Kommentar", key: "comment", width: 30 },
  ];

  const timeHeaderRow = timeSheet.getRow(1);
  timeHeaderRow.font = { bold: true };
  timeHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const e of timeEntries) {
    const name =
      userDisplayNames[e.user.id] ||
      e.user.name ||
      e.user.email ||
      "–";
    timeSheet.addRow({
      name,
      date: format(new Date(e.date), "dd.MM.yyyy", { locale: nb }),
      project: e.project.name,
      code: e.project.code || "",
      hours: Math.round(e.hours * 10) / 10,
      type: TIME_TYPE_LABELS[e.timeType] || e.timeType,
      comment: e.comment || "",
    });
  }

  // Oppsummering timer
  const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);
  const normalHours = timeEntries
    .filter((e) => e.timeType === "NORMAL")
    .reduce((s, e) => s + e.hours, 0);
  const overtime50 = timeEntries
    .filter((e) => e.timeType === "OVERTIME_50")
    .reduce((s, e) => s + e.hours, 0);
  const overtime40 = timeEntries
    .filter((e) => e.timeType === "OVERTIME_40")
    .reduce((s, e) => s + e.hours, 0);
  const overtime100 = timeEntries
    .filter((e) => e.timeType === "OVERTIME_100")
    .reduce((s, e) => s + e.hours, 0);
  const weekend = timeEntries
    .filter((e) => e.timeType === "WEEKEND")
    .reduce((s, e) => s + e.hours, 0);

  timeSheet.addRow([]);
  timeSheet.addRow([
    "",
    "",
    "",
    "Totalt:",
    totalHours,
    "",
    "",
  ]);
  const summaryRow = timeSheet.lastRow;
  if (summaryRow) summaryRow.font = { bold: true };

  // Sheet 2: Km godtgjørelse
  const mileageSheet = workbook.addWorksheet("Km godtgjørelse", {
    headerFooter: {
      firstHeader: `${tenantName} – Km godtgjørelse`,
      firstFooter: `Generert ${format(new Date(), "d. MMMM yyyy", { locale: nb })}`,
    },
  });

  mileageSheet.columns = [
    { header: "Navn", key: "name", width: 22 },
    { header: "Dato", key: "date", width: 12 },
    { header: "Prosjekt", key: "project", width: 25 },
    { header: "Kode", key: "code", width: 12 },
    { header: "Km", key: "km", width: 8 },
    { header: "Sats/km", key: "rate", width: 10 },
    { header: "Beløp (kr)", key: "amount", width: 12 },
    { header: "Kommentar", key: "comment", width: 25 },
  ];

  const mileageHeaderRow = mileageSheet.getRow(1);
  mileageHeaderRow.font = { bold: true };
  mileageHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  const defaultKmRateForSheet = config?.defaultKmRate ?? 4.5;
  for (const e of mileageEntries) {
    const name =
      userDisplayNames[e.user.id] ||
      e.user.name ||
      e.user.email ||
      "–";
    mileageSheet.addRow({
      name,
      date: format(new Date(e.date), "dd.MM.yyyy", { locale: nb }),
      project: e.project.name,
      code: e.project.code || "",
      km: Math.round(e.kilometers),
      rate: e.ratePerKm ?? "",
      amount: Math.round(
        e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRateForSheet)
      ),
      comment: e.comment || "",
    });
  }

  const totalAmount = mileageEntries.reduce(
    (s, e) =>
      s + (e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRateForSheet)),
    0
  );
  const totalKm = mileageEntries.reduce((s, e) => s + e.kilometers, 0);
  mileageSheet.addRow([]);
  mileageSheet.addRow([
    "",
    "",
    "",
    "Totalt:",
    totalKm,
    "",
    totalAmount,
    "",
  ]);
  const mileageSummaryRow = mileageSheet.lastRow;
  if (mileageSummaryRow) mileageSummaryRow.font = { bold: true };

  // Sheet 3: Lønn (per ansatt: timer-beregning + km godtgjørelse)
  const payrollSheet = workbook.addWorksheet("Lønn", {
    headerFooter: {
      firstHeader: `${tenantName} – Lønnsoversikt`,
      firstFooter: `Generert ${format(new Date(), "d. MMMM yyyy", { locale: nb })}`,
    },
  });

  const rate = config?.defaultHourlyRate ?? 0;
  const taxPercent = config?.approximateTaxPercent ?? 25;
  const defaultKmRate = config?.defaultKmRate ?? 4.5;
  const kmAllowanceTaxable = config?.kmAllowanceTaxable ?? false;
  const mult40 = config?.overtime40Multiplier ?? 1.4;
  const mult50 = config?.overtime50Multiplier ?? 1.5;
  const mult100 = config?.overtime100Multiplier ?? 2;

  const userIds = [
    ...new Set([
      ...timeEntries.map((e) => e.user.id),
      ...mileageEntries.map((e) => e.user.id),
    ]),
  ];

  const payrollRows: Array<{
    name: string;
    normalHours: number;
    overtime40: number;
    overtime50: number;
    overtime100: number;
    sickHours: number;
    travelHours: number;
    grossFromHours: number;
    kmAmount: number;
    taxAmount: number;
    netPay: number;
  }> = [];

  for (const uid of userIds) {
    const name =
      userDisplayNames[uid] ||
      timeEntries.find((e) => e.user.id === uid)?.user.name ||
      mileageEntries.find((e) => e.user.id === uid)?.user.email ||
      "–";

    const userTimeEntries = timeEntries.filter((e) => e.user.id === uid);
    const normalHours = userTimeEntries
      .filter((e) => e.timeType === "NORMAL")
      .reduce((s, e) => s + e.hours, 0);
    const travelHours = userTimeEntries
      .filter((e) => e.timeType === "TRAVEL")
      .reduce((s, e) => s + e.hours, 0);
    const overtime40 = userTimeEntries
      .filter((e) => e.timeType === "OVERTIME_40")
      .reduce((s, e) => s + e.hours, 0);
    const overtime50 = userTimeEntries
      .filter((e) => e.timeType === "OVERTIME_50")
      .reduce((s, e) => s + e.hours, 0);
    const overtime100 = userTimeEntries
      .filter((e) => e.timeType === "OVERTIME_100" || e.timeType === "WEEKEND")
      .reduce((s, e) => s + e.hours, 0);
    const sickHours = userTimeEntries
      .filter((e) => e.timeType === "SICK_LEAVE")
      .reduce((s, e) => s + e.hours, 0);

    const grossFromHours =
      rate > 0
        ? (normalHours + travelHours + sickHours) * rate +
          overtime40 * rate * mult40 +
          overtime50 * rate * mult50 +
          overtime100 * rate * mult100
        : 0;

    const userMileageEntries = mileageEntries.filter((e) => e.user.id === uid);
    const kmAmount = userMileageEntries.reduce(
      (s, e) => s + (e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRate)),
      0
    );
    const skattepliktigKmAmount = kmAllowanceTaxable
      ? userMileageEntries.reduce(
          (s, e) => {
            const r = e.ratePerKm ?? defaultKmRate;
            return s + e.kilometers * Math.max(0, r - TREKKFRI_KM_SATS);
          },
          0
        )
      : 0;

    const grossTaxable = grossFromHours + skattepliktigKmAmount;
    const taxAmount = grossTaxable * (taxPercent / 100);
    const netPay = grossFromHours + kmAmount - taxAmount;

    payrollRows.push({
      name: String(name),
      normalHours,
      overtime40,
      overtime50,
      overtime100,
      sickHours,
      travelHours,
      grossFromHours,
      kmAmount,
      taxAmount,
      netPay,
    });
  }

  payrollRows.sort((a, b) => a.name.localeCompare(b.name));

  payrollSheet.columns = [
    { header: "Navn", key: "name", width: 24 },
    { header: "Ordinær t", key: "normalHours", width: 10 },
    { header: "Overtid 40% t", key: "overtime40", width: 12 },
    { header: "Overtid 50% t", key: "overtime50", width: 12 },
    { header: "Overtid 100% t", key: "overtime100", width: 13 },
    { header: "Sykefravær t", key: "sickHours", width: 11 },
    { header: "Reise t", key: "travelHours", width: 9 },
    { header: "Brutto timer (kr)", key: "grossFromHours", width: 14 },
    { header: "Km godtgjørelse (kr)", key: "kmAmount", width: 18 },
    { header: "Ca. skatt (kr)", key: "taxAmount", width: 13 },
    { header: "Ca. utbetaling (kr)", key: "netPay", width: 17 },
  ];

  const payrollHeaderRow = payrollSheet.getRow(1);
  payrollHeaderRow.font = { bold: true };
  payrollHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const row of payrollRows) {
    payrollSheet.addRow({
      name: row.name,
      normalHours: Math.round(row.normalHours * 10) / 10,
      overtime40: Math.round(row.overtime40 * 10) / 10,
      overtime50: Math.round(row.overtime50 * 10) / 10,
      overtime100: Math.round(row.overtime100 * 10) / 10,
      sickHours: Math.round(row.sickHours * 10) / 10,
      travelHours: Math.round(row.travelHours * 10) / 10,
      grossFromHours: Math.round(row.grossFromHours),
      kmAmount: Math.round(row.kmAmount),
      taxAmount: Math.round(row.taxAmount),
      netPay: Math.round(row.netPay),
    });
  }

  if (rate === 0) {
    payrollSheet.addRow([]);
    payrollSheet.addRow([
      "",
      "Timelønn er ikke satt – brutto/utbetaling viser 0. Konfigurer i Lønn-innstillinger.",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function generateTimeRegistrationPdf(
  data: TimeRegistrationReportData
): Promise<Buffer> {
  const { generateBrandedPdf } = await import("@/lib/pdf-brand");
  const { tenantName, dateRange, timeEntries, mileageEntries, userDisplayNames } = data;
  const defaultKmRate = data.config?.defaultKmRate ?? 4.5;

  const periodStr = `${format(dateRange.from, "d. MMM yyyy", { locale: nb })} – ${format(dateRange.to, "d. MMM yyyy", { locale: nb })}`;

  let totalHours = 0;
  let totalKm = 0;
  let totalKmAmount = 0;

  const timeRows = timeEntries.map((e) => {
    const name = userDisplayNames[e.user.id] || e.user.name || e.user.email || "–";
    totalHours += e.hours;
    return [
      format(new Date(e.date), "dd.MM.yy"),
      name,
      e.project.name,
      `${(Math.round(e.hours * 10) / 10).toFixed(1)} t`,
      TIME_TYPE_LABELS[e.timeType] ?? e.timeType,
    ];
  });

  const kmRows = mileageEntries.map((e) => {
    const name = userDisplayNames[e.user.id] || e.user.name || e.user.email || "–";
    const amt = e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRate);
    totalKm += e.kilometers;
    totalKmAmount += amt;
    return [
      format(new Date(e.date), "dd.MM.yy"),
      name,
      e.project.name,
      `${Math.round(e.kilometers)} km`,
      `${Math.round(amt)} kr`,
    ];
  });

  return generateBrandedPdf({
    type: "operational",
    reportLabel: "Timeregistrering",
    title: "Timeregistrering – Rapport",
    subtitle: `Periode: ${periodStr}`,
    tenant: { name: tenantName },
    generatedAt: new Date(),
    sections: [
      {
        title: "Timer",
        content: timeRows.length > 0
          ? [{
              type: "table" as const,
              headers: ["Dato", "Ansatt", "Prosjekt", "Timer", "Type"],
              rows: [...timeRows, ["", "", "Sum timer", `${totalHours.toFixed(1)} t`, ""]],
            }]
          : [{ type: "paragraph" as const, text: "Ingen timer registrert i perioden." }],
      },
      {
        title: "Km-godtgjørelse",
        content: kmRows.length > 0
          ? [{
              type: "table" as const,
              headers: ["Dato", "Ansatt", "Prosjekt", "Km", "Beløp"],
              rows: [...kmRows, ["", "", "Sum", `${totalKm.toFixed(0)} km`, `${totalKmAmount.toFixed(0)} kr`]],
            }]
          : [{ type: "paragraph" as const, text: "Ingen km-godtgjørelse registrert i perioden." }],
      },
    ],
  });
}
