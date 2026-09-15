/**
 * Produktidentitet for matching mot masterkatalog / leverandørportal.
 * Fritekst på leverandør holder ikke (SDS-strategi steg 1–2).
 * GTIN: GS1 (EAN-8/12/13/14). Varenummer: leverandørens katalogkode.
 */

const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function normalizeGtin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (!GTIN_LENGTHS.has(digits.length)) return null;
  return digits;
}

export function parseGtinInput(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "GTIN må være tekst" };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = normalizeGtin(trimmed);
  if (!value) {
    return { ok: false, message: "GTIN må være 8, 12, 13 eller 14 siffer" };
  }
  return { ok: true, value };
}

export function normalizeSupplierProductCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim().slice(0, 80);
  return value.length > 0 ? value : null;
}

/** Nøkkel for å knytte tenant-rad til masterprodukt. GTIN vinner over leverandør+varenummer. */
export function chemicalCatalogMatchKey(input: {
  gtin?: string | null;
  supplier?: string | null;
  supplierProductCode?: string | null;
}): string | null {
  const gtin = normalizeGtin(input.gtin);
  if (gtin) return `gtin:${gtin}`;
  const code = normalizeSupplierProductCode(input.supplierProductCode);
  const supplier = input.supplier?.trim().toLowerCase();
  if (supplier && code) return `sku:${supplier}|${code.toLowerCase()}`;
  return null;
}

export function catalogLookupNumber(input: {
  supplierProductCode?: string | null;
  casNumber?: string | null;
}): string | null {
  return normalizeSupplierProductCode(input.supplierProductCode) || input.casNumber?.trim() || null;
}

export function readChemicalIdentity(input: {
  gtin?: unknown;
  supplierProductCode?: unknown;
}): { gtin: string | null; supplierProductCode: string | null } {
  const gtinResult = parseGtinInput(input.gtin);
  if (gtinResult.ok === false) {
    throw new Error(gtinResult.message);
  }
  const supplierProductCode =
    typeof input.supplierProductCode === "string"
      ? normalizeSupplierProductCode(input.supplierProductCode)
      : null;
  return { gtin: gtinResult.value, supplierProductCode };
}
