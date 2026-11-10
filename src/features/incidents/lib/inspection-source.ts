export interface InspectionSource {
  id: string;
  title: string;
  type: string;
}

export function inspectionSourcesFromFindings(
  findings: Array<{ inspection: InspectionSource }> | null | undefined,
): InspectionSource[] {
  const seen = new Set<string>();
  const sources: InspectionSource[] = [];
  for (const finding of findings ?? []) {
    if (seen.has(finding.inspection.id)) continue;
    seen.add(finding.inspection.id);
    sources.push(finding.inspection);
  }
  return sources;
}
