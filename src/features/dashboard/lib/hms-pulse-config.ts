export type HmsPulseSource = "compliance" | "function" | "form" | "custom";

export type HmsPulseComplianceKey =
  | "riskAssessment"
  | "incidents"
  | "formsLatest"
  | "inspections"
  | "measures"
  | "training"
  | "documents"
  | "audits";

export interface HmsPulseItem {
  id: string;
  title: string;
  href: string;
  source: HmsPulseSource;
  complianceKey?: HmsPulseComplianceKey;
  legalRef?: string;
}

export const DEFAULT_HMS_PULSE_ITEMS: HmsPulseItem[] = [
  {
    id: "compliance-risk-assessment",
    title: "Risikovurderinger",
    href: "/dashboard/risks",
    source: "compliance",
    complianceKey: "riskAssessment",
    legalRef: "AML § 3-1 (2) c, IK-HMS § 5 nr. 6",
  },
  {
    id: "compliance-incidents",
    title: "Avvik, skader og meldepliktige hendelser",
    href: "/dashboard/incidents",
    source: "compliance",
    complianceKey: "incidents",
    legalRef: "AML § 5-1, AML § 5-2",
  },
  {
    id: "compliance-forms-latest",
    title: "Siste utfylte skjemaer",
    href: "/dashboard/wellbeing",
    source: "compliance",
    complianceKey: "formsLatest",
    legalRef: "IK-HMS § 5 nr. 7 og nr. 8",
  },
  {
    id: "compliance-inspections",
    title: "Vernerunder og inspeksjoner",
    href: "/dashboard/inspections",
    source: "compliance",
    complianceKey: "inspections",
    legalRef: "AML § 3-1, IK-HMS § 5 nr. 6",
  },
  {
    id: "compliance-measures",
    title: "Tiltak og fristoppfølging",
    href: "/dashboard/actions",
    source: "compliance",
    complianceKey: "measures",
    legalRef: "IK-HMS § 5 nr. 6 og nr. 7",
  },
  {
    id: "compliance-training",
    title: "Opplæring og kompetanse",
    href: "/dashboard/training",
    source: "compliance",
    complianceKey: "training",
    legalRef: "IK-HMS § 5 nr. 2",
  },
  {
    id: "compliance-documents",
    title: "Dokumenterte rutiner og styrende dokumenter",
    href: "/dashboard/documents",
    source: "compliance",
    complianceKey: "documents",
    legalRef: "IK-HMS § 5 nr. 4, nr. 5 og nr. 7",
  },
  {
    id: "compliance-audits",
    title: "Revisjoner og ledelsens gjennomgang",
    href: "/dashboard/audits",
    source: "compliance",
    complianceKey: "audits",
    legalRef: "IK-HMS § 5 nr. 8",
  },
];

export const MANDATORY_HMS_PULSE_ITEM_IDS = DEFAULT_HMS_PULSE_ITEMS.map((item) => item.id);

export function ensureMandatoryHmsPulseItems(items: HmsPulseItem[]): HmsPulseItem[] {
  const existing = new Set(items.map((item) => item.id));
  const missing = DEFAULT_HMS_PULSE_ITEMS.filter((item) => !existing.has(item.id));
  return [...items, ...missing];
}

export function normalizeHmsPulseItems(input: HmsPulseItem[]): HmsPulseItem[] {
  const seen = new Set<string>();
  return input
    .filter((item) => typeof item.id === "string" && item.id.trim().length > 0)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .filter(
      (item) =>
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        typeof item.href === "string" &&
        item.href.trim().length > 0
    )
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      href: item.href.trim(),
      source: item.source,
      complianceKey: item.complianceKey,
      legalRef: item.legalRef?.trim() || undefined,
    }));
}
