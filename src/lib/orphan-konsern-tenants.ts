const KONSERN_SLUG_SUFFIX = /-([0-9a-z]{8})$/;
const EARLIEST_KONSERN_SLUG_MS = Date.UTC(2024, 0, 1);

/**
 * Bedrifter opprettet fra konsern får slug som slutter på
 * `Date.now().toString(36)` (8 tegn). Vanlig registrering bruker
 * bedriftsnavnet, eller et 13-sifret tidspunkt ved kollisjon.
 */
export function isKonsernCreatedSlug(slug: string, now = Date.now()): boolean {
  if (slug.startsWith("konsern-")) return true;

  const match = slug.match(KONSERN_SLUG_SUFFIX);
  if (!match) return false;

  const createdAt = Number.parseInt(match[1], 36);
  if (!Number.isSafeInteger(createdAt)) return false;
  return createdAt >= EARLIEST_KONSERN_SLUG_MS && createdAt <= now + 60_000;
}
