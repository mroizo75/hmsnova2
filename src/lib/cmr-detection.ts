/**
 * Detekterer CMR-klassifiseringer som krever eksponeringsregister
 * jf. Arbeidstilsynets krav (forskrift om utførelse av arbeid, kap. 31)
 *
 * Kategorier som utløser registreringsplikt:
 *   Carc. 1A / 1B  → H350 / "Carc. 1"
 *   Mut.  1A / 1B  → H340 / "Mut. 1"
 *   Repr. 1A / 1B  → H360 / "Repr. 1"
 *
 * Kat. 2 (H341, H351, H361) er IKKE registreringspliktige.
 */

export interface CmrClassification {
  code: string;   // f.eks. "Carc. 1A"
  hCode: string;  // f.eks. "H350"
  label: string;  // norsk beskrivelse
}

const CMR_PATTERNS: { pattern: RegExp; code: string; hCode: string; label: string }[] = [
  { pattern: /Carc\.?\s*1A/i,  code: "Carc. 1A", hCode: "H350", label: "Kreftfremkallende kat. 1A" },
  { pattern: /Carc\.?\s*1B/i,  code: "Carc. 1B", hCode: "H350", label: "Kreftfremkallende kat. 1B" },
  { pattern: /Mut\.?\s*1A/i,   code: "Mut. 1A",  hCode: "H340", label: "Mutagent kat. 1A" },
  { pattern: /Mut\.?\s*1B/i,   code: "Mut. 1B",  hCode: "H340", label: "Mutagent kat. 1B" },
  { pattern: /Repr\.?\s*1A/i,  code: "Repr. 1A", hCode: "H360", label: "Reproduksjonstoksisk kat. 1A" },
  { pattern: /Repr\.?\s*1B/i,  code: "Repr. 1B", hCode: "H360", label: "Reproduksjonstoksisk kat. 1B" },
];

// H-kode-basert fallback (hvis klassifiseringstekst ikke er tilgjengelig)
const HCODE_PATTERNS: { pattern: RegExp; code: string; hCode: string; label: string }[] = [
  { pattern: /\bH350\b/,  code: "Carc. 1A/1B", hCode: "H350", label: "Kreftfremkallende (H350)" },
  { pattern: /\bH340\b/,  code: "Mut. 1A/1B",  hCode: "H340", label: "Mutagent (H340)" },
  { pattern: /\bH360\b/,  code: "Repr. 1A/1B", hCode: "H360", label: "Reproduksjonstoksisk (H360)" },
];

export function detectCmrClassifications(
  hazardStatements: string | null | undefined,
  isCMR: boolean
): CmrClassification[] {
  if (!hazardStatements && !isCMR) return [];

  const text = hazardStatements ?? "";
  const found: CmrClassification[] = [];
  const foundCodes = new Set<string>();

  // Først: match spesifikke kategorier (1A/1B)
  for (const { pattern, code, hCode, label } of CMR_PATTERNS) {
    if (pattern.test(text) && !foundCodes.has(code)) {
      found.push({ code, hCode, label });
      foundCodes.add(code);
    }
  }

  // Fallback: H-koder alene (hvis isCMR=true men ingen spesifikk tekst)
  if (isCMR && found.length === 0) {
    for (const { pattern, code, hCode, label } of HCODE_PATTERNS) {
      if (pattern.test(text) && !foundCodes.has(code)) {
        found.push({ code, hCode, label });
        foundCodes.add(code);
      }
    }
    // Hvis isCMR=true men ingen H-koder heller
    if (found.length === 0) {
      found.push({ code: "CMR", hCode: "H340/H350/H360", label: "CMR-stoff (kategori ikke spesifisert)" });
    }
  }

  return found;
}

/**
 * Returnerer true hvis kjemikaliet krever eksponeringsregister
 */
export function requiresExposureRegister(
  hazardStatements: string | null | undefined,
  isCMR: boolean
): boolean {
  return detectCmrClassifications(hazardStatements, isCMR).length > 0;
}
