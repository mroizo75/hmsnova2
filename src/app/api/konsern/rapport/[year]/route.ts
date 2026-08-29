import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBrandedPdf, type PdfSection, type PdfContent } from "@/lib/pdf-brand";
import { generateGroupAnnualReport, type GroupAnnualReportData } from "@/server/actions/corporate-group-stats.actions";

interface RouteParams {
  params: Promise<{ year: string }>;
}

function incidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    AVVIK: "Avvik", NESTEN: "Nestenulykke", ULYKKE: "Ulykke",
    FARLIG_SITUASJON: "Farlig situasjon", YRKESSYKDOM: "Yrkessykdom",
    MILJO: "Miljøavvik", KVALITET: "Kvalitetsavvik", CUSTOMER: "Kundeklage",
  };
  return labels[type] ?? type;
}

function buildSections(data: GroupAnnualReportData): PdfSection[] {
  const sections: PdfSection[] = [];

  // 1. Ledersammendrag
  sections.push({
    title: "Ledersammendrag",
    content: [
      {
        type: "keyvalue",
        pairs: [
          ["Rapportperiode", `${data.year}`],
          ["Antall bedrifter", `${data.summary.totalTenants}`],
          ["Totalt antall ansatte", `${data.summary.totalEmployees}`],
          ["Gjennomsnittlig HMS-score", `${data.summary.averageHmsScore}%`],
          ["Totalt hendelser (12 mnd)", `${data.summary.totalIncidents}`],
          ["Åpne hendelser", `${data.summary.openIncidents}`],
        ],
      },
    ],
  });

  // 2. HMS-compliance per bedrift
  if (data.tenantScores.length > 0) {
    sections.push({
      title: "HMS-compliance per bedrift",
      legalRef: "Internkontrollforskriften § 5",
      content: [
        {
          type: "table",
          headers: ["Bedrift", "Samlet", "Rutiner", "Risiko", "Dokumenter", "Vernerunder", "Opplæring"],
          rows: data.tenantScores
            .sort((a, b) => a.overallScore - b.overallScore)
            .map((t) => [
              t.tenantName,
              `${t.overallScore}%`,
              `${t.routineScore}%`,
              `${t.riskScore}%`,
              `${t.documentScore}%`,
              `${t.inspectionScore}%`,
              `${t.trainingScore}%`,
            ]),
        },
      ],
    });
  }

  // 3. Hendelsesanalyse
  const incidentContent: PdfContent[] = [];
  if (data.incidentStats.byType.length > 0) {
    incidentContent.push({
      type: "table",
      headers: ["Type", "Antall"],
      rows: data.incidentStats.byType.map((t) => [incidentTypeLabel(t.type), t._count]),
    });
  }
  incidentContent.push({
    type: "keyvalue",
    pairs: [
      ["Åpne hendelser", `${data.incidentStats.totals.open}`],
      ["Lukkede hendelser", `${data.incidentStats.totals.closed}`],
      ["Totalt", `${data.incidentStats.totals.total}`],
    ],
  });
  sections.push({
    title: "Hendelsesanalyse",
    legalRef: "AML § 5-1, § 5-2",
    content: incidentContent,
  });

  // 4. Opplæringsstatus
  if (data.trainingStatus.length > 0) {
    sections.push({
      title: "Opplæringsstatus",
      legalRef: "AML § 3-2, § 3-5",
      content: [
        {
          type: "table",
          headers: ["Bedrift", "Ansatte", "Gyldige kurs", "Utgåtte kurs"],
          rows: data.trainingStatus.map((t) => [
            t.tenantName,
            t.employees,
            t.validCourses,
            t.expiredCourses,
          ]),
        },
      ],
    });
  }

  // 5. Vernerunder
  if (data.inspectionStatus.length > 0) {
    sections.push({
      title: "Vernerunder og inspeksjoner",
      legalRef: "AML § 6-2",
      content: [
        {
          type: "table",
          headers: ["Bedrift", "Fullført", "Planlagt", "Siste fullført"],
          rows: data.inspectionStatus.map((i) => [
            i.tenantName,
            i.completedCount,
            i.plannedCount,
            i.lastCompletedDate
              ? i.lastCompletedDate.toLocaleDateString("nb-NO")
              : "Ingen",
          ]),
        },
      ],
    });
  }

  // 6. Psykososialt arbeidsmiljø
  const wellbeingWithData = data.wellbeing.filter((w) => w.averageScore !== null);
  if (wellbeingWithData.length > 0) {
    sections.push({
      title: "Psykososialt arbeidsmiljø",
      legalRef: "AML § 4-3, ISO 45003",
      content: [
        {
          type: "alert",
          text: "Kun bedrifter med 5 eller flere besvarelser vises (GDPR Art. 9 — anonymitetsgrense).",
          severity: "info",
        },
        {
          type: "table",
          headers: ["Bedrift", "Score (1-5)", "Besvarelser", "Kritiske hendelser"],
          rows: wellbeingWithData
            .sort((a, b) => (a.averageScore ?? 5) - (b.averageScore ?? 5))
            .map((w) => [
              w.tenantName,
              w.averageScore,
              w.totalResponses,
              w.criticalCount,
            ]),
        },
      ],
    });
  }

  const noSurveyTenants = data.wellbeing.filter((w) => w.totalResponses === 0);
  if (noSurveyTenants.length > 0) {
    sections.push({
      title: "Bedrifter uten psykososial kartlegging",
      content: [
        {
          type: "alert",
          text: `${noSurveyTenants.length} bedrift(er) har ikke gjennomført psykososial kartlegging.`,
          severity: "warning",
        },
        {
          type: "paragraph",
          text: noSurveyTenants.map((t) => t.tenantName).join(", "),
        },
      ],
    });
  }

  // 7. Varsler og anbefalinger
  if (data.alerts.length > 0) {
    const alertContent: PdfContent[] = data.alerts.map((a) => ({
      type: "alert" as const,
      text: `${a.tenantName}: ${a.message}`,
      severity: a.type === "critical" ? "danger" as const : a.type === "warning" ? "warning" as const : "info" as const,
    }));
    sections.push({
      title: "Varsler og anbefalinger",
      content: alertContent,
    });
  }

  return sections;
}

export async function GET(_: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.corporateGroupId) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Ugyldig år" }, { status: 400 });
  }

  const reportData = await generateGroupAnnualReport(year);

  const pdf = await generateBrandedPdf({
    type: "formal",
    title: `HMS-årsrapport ${year}`,
    subtitle: reportData.groupName,
    reportLabel: "Konsern HMS-rapport",
    tenant: {
      name: reportData.groupName,
      orgNumber: reportData.groupOrgNumber,
      logoUrl: reportData.groupLogo,
    },
    generatedAt: new Date(),
    legalReference: "Internkontrollforskriften § 5, AML kap. 3-5",
    sections: buildSections(reportData),
    coverPage: true,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="HMS-rapport-${reportData.groupName.replace(/\s+/g, "_")}-${year}.pdf"`,
    },
  });
}
