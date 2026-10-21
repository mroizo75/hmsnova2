/**
 * Hjelpefunksjoner for å lagre flere sertifikat-nøkler i ett felt.
 * Bakoverkompatibel: en enkelt nøkkel lagres som ren streng,
 * flere nøkler lagres som JSON-array.
 */

export function parseProofDocKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === "string" && k.length > 0);
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}

export function formatProofDocKeys(keys: string[]): string | null {
  const filtered = keys.filter((k) => k.length > 0);
  if (filtered.length === 0) return null;
  if (filtered.length === 1) return filtered[0];
  return JSON.stringify(filtered);
}

export function hasProofDocs(raw: string | null | undefined): boolean {
  return parseProofDocKeys(raw).length > 0;
}
