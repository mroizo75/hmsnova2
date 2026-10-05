export interface SjaSourceRisk {
  id: string;
  title: string;
  context: string;
  description: string | null;
  riskStatement: string | null;
  likelihood: number;
  consequence: number;
  score: number;
  existingControls: string | null;
  measures: Array<{ title: string; status: string }>;
}

export interface SjaRiskSnapshot {
  riskId: string;
  assessmentId: string | null;
  title: string;
  context: string;
  description: string | null;
  riskStatement: string | null;
  likelihood: number;
  consequence: number;
  score: number;
  existingControls: string | null;
  measures: Array<{ title: string; status: string }>;
  capturedAt: string;
}

export function mapRiskToSjaHazard(risk: SjaSourceRisk) {
  const measureLines = [
    risk.existingControls,
    ...risk.measures.map((measure) => measure.title),
  ].filter((value): value is string => Boolean(value?.trim()));

  return {
    activity: risk.title,
    hazard: risk.context || risk.description || risk.title,
    consequence: risk.riskStatement || risk.description || "",
    probability: risk.likelihood,
    severity: risk.consequence,
    measures:
      measureLines.length > 0
        ? measureLines.join("\n")
        : "Tiltak må vurderes og beskrives for dette arbeidet",
    responsibleName: "",
    linkedRiskId: risk.id,
  };
}

export function createSjaRiskSnapshot(
  risk: SjaSourceRisk & { riskAssessmentId?: string | null },
  capturedAt: Date,
): SjaRiskSnapshot {
  return {
    riskId: risk.id,
    assessmentId: risk.riskAssessmentId ?? null,
    title: risk.title,
    context: risk.context,
    description: risk.description,
    riskStatement: risk.riskStatement,
    likelihood: risk.likelihood,
    consequence: risk.consequence,
    score: risk.score,
    existingControls: risk.existingControls,
    measures: risk.measures.map((measure) => ({
      title: measure.title,
      status: measure.status,
    })),
    capturedAt: capturedAt.toISOString(),
  };
}
