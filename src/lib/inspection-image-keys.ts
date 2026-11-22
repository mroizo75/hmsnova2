const UNSAFE_KEY = /(\.\.|\\|\/\/|%2e%2e)/i;

/** Nøkler lagres som JSON-array på funnet. Ugyldig JSON gir ingen bilder. */
export function parseStoredInspectionImageKeys(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => isInspectionImageKey(key));
  } catch {
    return [];
  }
}

export function isInspectionImageKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.startsWith("tenants/") &&
    key.includes("/inspections/") &&
    !UNSAFE_KEY.test(key)
  );
}

export function inspectionImageSrc(key: string): string {
  return `/api/inspections/images/${key}`;
}

export function imagesFromInspectionFindings(
  findings: Array<{ imageKeys: string | null }> | null | undefined,
): Array<{ key: string; src: string; alt: string }> {
  const seen = new Set<string>();
  const images: Array<{ key: string; src: string; alt: string }> = [];
  for (const finding of findings ?? []) {
    for (const key of parseStoredInspectionImageKeys(finding.imageKeys)) {
      if (seen.has(key)) continue;
      seen.add(key);
      images.push({
        key,
        src: inspectionImageSrc(key),
        alt: "Bilde fra vernerunde",
      });
    }
  }
  return images;
}
