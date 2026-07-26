/**
 * Normaliserer en lagret bildeverdi til en visbar URL.
 *
 * Tre mulige verdier i config.imageUrl / config.pdfUrl:
 *  1. Full URL (http/https) — bruk direkte (eldre data eller ekstern lenke)
 *  2. R2-nøkkel (starter med "hms-tavle/") — konverter til intern proxy-URL
 *  3. Tom streng / null — returner tom streng
 */
export function toImageUrl(stored: string | null | undefined): string {
  if (!stored) return "";
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
  if (stored.startsWith("hms-tavle/")) return `/api/hms-tavle/images/${stored}`;
  return stored;
}
