import { isHealthcareIndustry } from "@/lib/tenant-features";

const HEALTHCARE_NACE_PREFIXES = ["86", "87", "88"];

/**
 * Helse- og omsorgstjenester (NACE 86–88) og bransjevalget helse.
 * Pasient-ID vises bare her.
 */
export function isHealthcareTenant(input: {
  industry?: string | null;
  naceCode?: string | null;
}): boolean {
  if (isHealthcareIndustry(input.industry)) return true;
  const normalized = (input.industry ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "helse og omsorg" || normalized === "helseomsorg") return true;
  const nace = (input.naceCode ?? "").replace(/\s/g, "");
  return HEALTHCARE_NACE_PREFIXES.some((prefix) => nace.startsWith(prefix));
}

/**
 * Intern pasient-ID, ikke fødselsnummer.
 * Pasientjournalloven og GDPR art. 9: HMS-saken skal ikke inneholde nasjonalt id-nummer.
 */
export function normalizePatientReference(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  const compact = trimmed.replace(/[\s-]/g, "");
  if (/^\d{11}$/.test(compact)) {
    return {
      ok: false,
      error: "Fødselsnummer skal ikke lagres her. Bruk intern pasient-ID.",
    };
  }
  if (trimmed.length > 40) {
    return { ok: false, error: "Pasient-ID kan være maks 40 tegn." };
  }
  if (!/^[A-Za-z0-9ÆØÅæøå .:_/-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Pasient-ID kan bare inneholde bokstaver, tall og bindestrek.",
    };
  }
  return { ok: true, value: trimmed };
}
