/**
 * Miljørapport-generator for Miljøfyrtårn-godkjenning.
 * Bruker Adobe Document Generation via pdf-brand.
 */

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import type {
  EnvironmentalAspect,
  EnvironmentalMeasurement,
  Goal,
  Measure,
  User,
} from "@prisma/client";

interface ReportData {
  tenant: {
    id: string;
    name: string;
    orgNumber: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    industry: string | null;
  };
  year: number;
  aspects: Array<
    EnvironmentalAspect & {
      owner: Pick<User, "name" | "email"> | null;
      goal: Pick<Goal, "title" | "targetValue" | "currentValue" | "unit"> | null;
      measurements: EnvironmentalMeasurement[];
    }
  >;
  measurements: Array<
    EnvironmentalMeasurement & {
      aspect: { title: string; category: string };
      responsible: { name: string | null } | null;
    }
  >;
  goals: Array<
    Goal & {
      measurements: Array<{ measurementDate: Date; value: number }>;
    }
  >;
  measures: Array<
    Measure & {
      responsible: { name: string | null };
      environmentalAspect: { title: string; category: string } | null;
    }
  >;
}

const CO2_FACTORS = {
  ENERGY: 0.385,
  WATER: 0.001,
  WASTE: 0.5,
  EMISSIONS: 1.0,
  RESOURCE_USE: 0.2,
};

export async function generateEnvironmentalReport(data: ReportData): Promise<Buffer> {
  const totalAspects = data.aspects.length;
  const criticalAspects = data.aspects.filter((a) => a.significanceScore >= 20).length;
  const goalsAchieved = data.goals.filter((g) => g.status === "ACHIEVED").length;
  const completedMeasures = data.measures.filter((m) => m.status === "DONE").length;

  let totalCO2Savings = 0;
  const co2ByCategory: Record<string, number> = {};
  data.measurements.forEach((m) => {
    const category = m.aspect.category as keyof typeof CO2_FACTORS;
    const factor = CO2_FACTORS[category] || 0;
    if (m.targetValue && m.measuredValue < m.targetValue) {
      const savings = (m.targetValue - m.measuredValue) * factor;
      totalCO2Savings += savings;
      co2ByCategory[category] = (co2ByCategory[category] || 0) + savings;
    }
  });

  const trees = Math.round(totalCO2Savings / 21);
  const cars = totalCO2Savings / 4600;
  const fmt = (d: Date | string | null | undefined) =>
    d ? format(new Date(d), "d. MMMM yyyy", { locale: nb }) : "–";

  const sections: PdfSection[] = [
    {
      title: "Sammendrag",
      legalRef: "ISO 14001:2015 kap. 6.1.2 og 9.1",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Rapportår", String(data.year)],
            ["Miljøaspekter", String(totalAspects)],
            ["Kritiske aspekter", String(criticalAspects)],
            ["Miljømål oppnådd", `${goalsAchieved} av ${data.goals.length}`],
            ["Tiltak fullført", `${completedMeasures} av ${data.measures.length}`],
            ["Målinger", String(data.measurements.length)],
          ],
        },
      ],
    },
    {
      title: "Om bedriften",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Bedrift", data.tenant.name],
            ["Org.nr", data.tenant.orgNumber ?? "–"],
            ["Adresse", [data.tenant.address, data.tenant.postalCode, data.tenant.city].filter(Boolean).join(", ") || "–"],
            ["Bransje", data.tenant.industry ?? "–"],
            ["E-post", data.tenant.contactEmail ?? "–"],
            ["Telefon", data.tenant.contactPhone ?? "–"],
          ],
        },
      ],
    },
  ];

  if (data.aspects.length > 0) {
    sections.push({
      title: "Miljøaspekter og påvirkning",
      legalRef: "ISO 14001:2015 kap. 6.1.2",
      content: [
        {
          type: "table",
          headers: ["Aspekt", "Kategori", "Betydning", "Status"],
          rows: data.aspects.map((a) => [
            a.title,
            getCategoryLabel(a.category),
            `${a.significanceScore}/25`,
            getStatusLabel(a.status),
          ]),
        },
      ],
    });
  }

  if (data.goals.length > 0) {
    sections.push({
      title: "Miljømål og resultater",
      legalRef: "ISO 14001:2015 kap. 6.2",
      content: [
        {
          type: "table",
          headers: ["Mål", "Status", "Målverdi", "Oppnådd", "Frist"],
          rows: data.goals.map((g) => [
            g.title,
            getGoalStatusLabel(g.status),
            g.targetValue != null ? `${g.targetValue} ${g.unit ?? ""}`.trim() : "–",
            g.currentValue != null ? `${g.currentValue} ${g.unit ?? ""}`.trim() : "–",
            fmt(g.deadline),
          ]),
        },
      ],
    });
  }

  if (data.measurements.length > 0) {
    sections.push({
      title: "Målinger og data",
      legalRef: "ISO 14001:2015 kap. 9.1",
      content: [
        {
          type: "table",
          headers: ["Aspekt", "Kategori", "Verdi", "Enhet", "Dato", "Status"],
          rows: data.measurements.slice(0, 40).map((m) => [
            m.aspect.title,
            getCategoryLabel(m.aspect.category),
            m.measuredValue,
            m.unit ?? "–",
            fmt(m.measurementDate),
            m.status,
          ]),
        },
      ],
    });
  }

  sections.push({
    title: "CO2-fotavtrykk og besparelser",
    content: [
      {
        type: "keyvalue",
        pairs: [
          ["Beregnet besparelse", `${totalCO2Savings.toFixed(1)} kg CO2e`],
          ["Tilsvarer trær", String(trees)],
          ["Tilsvarer bilkm", `${cars.toFixed(1)}`],
        ],
      },
      ...(Object.keys(co2ByCategory).length > 0
        ? [
            {
              type: "table" as const,
              headers: ["Kategori", "Besparelse (kg CO2e)"],
              rows: Object.entries(co2ByCategory).map(([cat, val]) => [
                getCategoryLabel(cat),
                val.toFixed(1),
              ]),
            },
          ]
        : []),
    ],
  });

  if (data.measures.length > 0) {
    sections.push({
      title: "Tiltak og handlingsplan",
      legalRef: "ISO 14001:2015 kap. 6.1.4 / 10.2",
      content: [
        {
          type: "table",
          headers: ["Tiltak", "Status", "Aspekt", "Ansvarlig"],
          rows: data.measures.map((m) => [
            m.title ?? m.description ?? "–",
            m.status,
            m.environmentalAspect?.title ?? "–",
            m.responsible?.name ?? "–",
          ]),
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: "Miljørapport",
    title: `Årlig miljørapport ${data.year}`,
    subtitle: `${data.tenant.name} · ISO 14001 / Miljøfyrtårn`,
    tenant: {
      name: data.tenant.name,
      orgNumber: data.tenant.orgNumber,
      address: data.tenant.address,
    },
    generatedAt: new Date(),
    legalReference: "ISO 14001:2015 kap. 6.1.2 og 9.1",
    coverPage: true,
    sections,
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    MONITORED: "Overvåket",
    CLOSED: "Lukket",
  };
  return labels[status] || status;
}

function getGoalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    ACHIEVED: "Oppnådd",
    AT_RISK: "I risiko",
    FAILED: "Ikke oppnådd",
    ARCHIVED: "Arkivert",
  };
  return labels[status] || status;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ENERGY: "Energibruk",
    WATER: "Vannforbruk",
    WASTE: "Avfallshåndtering",
    EMISSIONS: "Utslipp til luft",
    RESOURCE_USE: "Ressursbruk",
    BIODIVERSITY: "Biologisk mangfold",
    OTHER: "Annet",
  };
  return labels[category] || category;
}
