/**
 * Kommersiell Tripletex-integrasjon: consumer token + applikasjonsnavn
 * kommer fra Tripletex etter godkjenning. Employee token limes inn per bedrift.
 * Støtter både korrekt stavemåte og TRIPELTEX_* fra velkomstmail.
 */

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
