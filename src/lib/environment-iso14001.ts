/** ISO 14001:2026 6.1.2 – livsløpsperspektiv ved miljøaspekter. */
export const ENVIRONMENT_LIFECYCLE_STAGES = [
  "DESIGN",
  "PROCUREMENT",
  "PRODUCTION",
  "USE",
  "END_OF_LIFE",
] as const;

export type EnvironmentLifecycleStage = (typeof ENVIRONMENT_LIFECYCLE_STAGES)[number];

export const ENVIRONMENT_LIFECYCLE_LABELS: Record<EnvironmentLifecycleStage, string> = {
  DESIGN: "Design og utvikling",
  PROCUREMENT: "Innkjøp og leverandør",
  PRODUCTION: "Produksjon og drift",
  USE: "Bruk",
  END_OF_LIFE: "Avhending og slutt",
};

const STAGE_SET = new Set<string>(ENVIRONMENT_LIFECYCLE_STAGES);

export function parseLifecycleStages(raw: string | null | undefined): EnvironmentLifecycleStage[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is EnvironmentLifecycleStage =>
      typeof item === "string" && STAGE_SET.has(item),
    );
  } catch {
    return [];
  }
}

export function serializeLifecycleStages(stages: readonly string[]): string | null {
  const unique = [...new Set(stages.filter((item) => STAGE_SET.has(item)))];
  return unique.length > 0 ? JSON.stringify(unique) : null;
}

export const ENVIRONMENT_CONTEXT_LABELS = {
  climate: "Klimaendringer",
  biodiversity: "Naturmangfold",
  resources: "Ressursbruk og -tilgang",
  pollution: "Forurensning",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  RESOURCE_USE: "Ressursbruk",
  ENERGY: "Energi",
  WATER: "Vann",
  WASTE: "Avfall",
  EMISSIONS: "Utslipp",
  BIODIVERSITY: "Biologisk mangfold",
  OTHER: "Annet",
};

export interface EnvironmentReviewAspect {
  title: string;
  category: string;
  significanceScore: number;
  status: string;
  contextClimate: boolean;
  contextBiodiversity: boolean;
  contextResources: boolean;
  contextPollution: boolean;
}

export interface EnvironmentReviewMeasurement {
  status: string;
  parameter: string;
}

export interface EnvironmentReviewIncident {
  title: string;
  status: string;
}

export interface EnvironmentReviewGoal {
  title: string;
  status: string;
}

/** ISO 14001:2026 9.3 – input til ledelsens gjennomgåelse av miljøprestasjon. */
export function generateEnvironmentReviewSummary(input: {
  aspects: EnvironmentReviewAspect[];
  measurements: EnvironmentReviewMeasurement[];
  environmentIncidents: EnvironmentReviewIncident[];
  environmentGoals: EnvironmentReviewGoal[];
}): string {
  const { aspects, measurements, environmentIncidents, environmentGoals } = input;
  const lines: string[] = ["## Miljøprestasjon (ISO 14001:2026 9.3)", ""];

  lines.push(`Aktive miljøaspekter: ${aspects.filter((a) => a.status !== "CLOSED").length} av ${aspects.length}`);
  const high = aspects.filter((a) => a.significanceScore >= 12 && a.status !== "CLOSED");
  if (high.length > 0) {
    lines.push(`Vesentlige aspekter (score ≥ 12): ${high.length}`);
    high.slice(0, 8).forEach((aspect) => {
      lines.push(`- ${aspect.title} (${CATEGORY_LABELS[aspect.category] ?? aspect.category}, score ${aspect.significanceScore})`);
    });
  } else if (aspects.length === 0) {
    lines.push("Ingen miljøaspekter er registrert. Kartlegg aspekter med livsløp og kontekst (krav 6.1.2 og 4.1).");
  }

  const contextCounts = {
    climate: aspects.filter((a) => a.contextClimate).length,
    biodiversity: aspects.filter((a) => a.contextBiodiversity).length,
    resources: aspects.filter((a) => a.contextResources).length,
    pollution: aspects.filter((a) => a.contextPollution).length,
  };
  lines.push("");
  lines.push("Relevante miljøforhold (4.1):");
  lines.push(`- Klima: ${contextCounts.climate} aspekter`);
  lines.push(`- Naturmangfold: ${contextCounts.biodiversity} aspekter`);
  lines.push(`- Ressurser: ${contextCounts.resources} aspekter`);
  lines.push(`- Forurensning: ${contextCounts.pollution} aspekter`);

  const nonCompliant = measurements.filter((m) => m.status === "NON_COMPLIANT").length;
  const warning = measurements.filter((m) => m.status === "WARNING").length;
  lines.push("");
  lines.push(`Målinger i perioden: ${measurements.length} (avvik: ${nonCompliant}, varsel: ${warning})`);

  lines.push("");
  lines.push(`Miljøavvik: ${environmentIncidents.length}`);
  environmentIncidents.slice(0, 5).forEach((incident) => {
    lines.push(`- ${incident.title} (${incident.status})`);
  });

  lines.push("");
  lines.push(`Miljømål: ${environmentGoals.length}`);
  environmentGoals.slice(0, 8).forEach((goal) => {
    lines.push(`- ${goal.title} (${goal.status})`);
  });

  return lines.join("\n");
}
