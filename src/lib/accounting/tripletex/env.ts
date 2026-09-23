/**
 * Kommersiell Tripletex-integrasjon: consumer token + applikasjonsnavn
 * kommer fra Tripletex etter godkjenning. Employee token limes inn per bedrift.
 * Støtter både korrekt stavemåte og TRIPELTEX_* fra velkomstmail.
 *
 * Testkonto-tokens virker bare mot api-test.tripletex.tech.
 * Produksjonstokens virker bare mot tripletex.no.
 */

export const TRIPLETEX_PROD_API_BASE = "https://tripletex.no/v2";
export const TRIPLETEX_TEST_API_BASE = "https://api-test.tripletex.tech/v2";

function normalizeApiBase(value: string): string {
  return value.replace(/\/$/, "");
}

export function getTripletexConfiguredApiBase(): string | null {
  const value = process.env.TRIPLETEX_API_BASE?.trim() || process.env.TRIPELTEX_API_BASE?.trim() || "";
  return value.length > 0 ? normalizeApiBase(value) : null;
}

/** Eksplisitt base, ellers både prod og test slik at testkonto kobler uten ekstra env. */
export function tripletexApiBaseCandidates(): string[] {
  const configured = getTripletexConfiguredApiBase();
  if (configured) return [configured];
  return [TRIPLETEX_PROD_API_BASE, TRIPLETEX_TEST_API_BASE];
}

export function getTripletexConsumerToken(): string | null {
  const value =
    process.env.TRIPLETEX_CONSUMER_TOKEN?.trim() ||
    process.env.TRIPLETEX_TOKEN?.trim() ||
    process.env.TRIPELTEX_TOKEN?.trim() ||
    "";
  return value.length > 0 ? value : null;
}

export function getTripletexApplicationName(): string {
  return (
    process.env.TRIPLETEX_APP_NAME?.trim() ||
    process.env.TRIPELTEX_APP_NAME?.trim() ||
    "HMS Nova"
  );
}

export function isTripletexConsumerConfigured(): boolean {
  return Boolean(getTripletexConsumerToken());
}
