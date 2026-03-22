type IndustryScopeInput = unknown;

export function normalizeIndustry(industry: string | null | undefined): string | null {
  if (!industry) {
    return null;
  }

  const normalized = industry.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function parseIndustryScope(input: IndustryScopeInput): string[] {
  if (!input) {
    return ["all"];
  }

  if (Array.isArray(input)) {
    return input
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return ["all"];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length > 0);
      }
    } catch {
      return [trimmed.toLowerCase()];
    }

    return [trimmed.toLowerCase()];
  }

  return ["all"];
}

export function matchesIndustryScope(
  industryScope: IndustryScopeInput,
  tenantIndustry: string | null | undefined
): boolean {
  const normalizedIndustry = normalizeIndustry(tenantIndustry);
  const scope = parseIndustryScope(industryScope);

  if (scope.length === 0 || scope.includes("all")) {
    return true;
  }

  if (!normalizedIndustry) {
    return false;
  }

  return scope.includes(normalizedIndustry);
}

export function toIndustryScopeJson(industryScope: string[] | null | undefined): string[] {
  if (!industryScope || industryScope.length === 0) {
    return ["all"];
  }

  const normalized = Array.from(
    new Set(
      industryScope
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
    )
  );

  return normalized.length > 0 ? normalized : ["all"];
}
