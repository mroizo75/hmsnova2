export type InspectionFindingDraft = {
  title: string;
  description: string;
  severity: number;
  location: string;
  imageKeys: string[];
  linkedFindingId?: string;
};

export function createEmptyInspectionFinding(title = ""): InspectionFindingDraft {
  return {
    title,
    description: "",
    severity: 3,
    location: "",
    imageKeys: [],
  };
}

function clampSeverity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(5, value));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeInspectionFinding(
  raw: unknown,
  fallbackTitle: string,
): InspectionFindingDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const typed = raw as Record<string, unknown>;
  const title = asString(typed.title).trim() || fallbackTitle;
  const imageKeys = Array.isArray(typed.imageKeys)
    ? typed.imageKeys.filter((key): key is string => typeof key === "string")
    : [];
  const linkedFindingId =
    typeof typed.linkedFindingId === "string" && typed.linkedFindingId.length > 0
      ? typed.linkedFindingId
      : undefined;

  return {
    title,
    description: asString(typed.description),
    severity: clampSeverity(typed.severity),
    location: asString(typed.location),
    imageKeys,
    linkedFindingId,
  };
}

/**
 * Leser funn fra sjekkpunkt. Støtter både ny `findings[]` og eldre enkeltfelt.
 */
export function findingsFromChecklistItem(
  raw: Record<string, unknown>,
  itemTitle: string,
): InspectionFindingDraft[] {
  if (Array.isArray(raw.findings)) {
    const findings = raw.findings
      .map((finding) => normalizeInspectionFinding(finding, itemTitle))
      .filter((finding): finding is InspectionFindingDraft => finding !== null);
    if (findings.length > 0) return findings;
  }

  const hasLegacy =
    asString(raw.findingTitle).trim().length > 0 ||
    asString(raw.findingDescription).trim().length > 0 ||
    asString(raw.linkedFindingId).length > 0 ||
    (Array.isArray(raw.findingImageKeys) && raw.findingImageKeys.length > 0);

  if (!hasLegacy) return [];

  const imageKeys = Array.isArray(raw.findingImageKeys)
    ? raw.findingImageKeys.filter((key): key is string => typeof key === "string")
    : [];

  return [
    {
      title: asString(raw.findingTitle).trim() || itemTitle,
      description: asString(raw.findingDescription),
      severity: clampSeverity(raw.findingSeverity),
      location: asString(raw.findingLocation),
      imageKeys,
      linkedFindingId:
        typeof raw.linkedFindingId === "string" && raw.linkedFindingId.length > 0
          ? raw.linkedFindingId
          : undefined,
    },
  ];
}
