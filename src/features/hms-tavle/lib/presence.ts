/** Hvem som er på plassen nå. Byggherreforskriften § 15. */

export interface PresenceRow {
  name: string;
  userId?: string | null;
  checkedOutAt?: Date | string | null;
}

/** Åpne innsjekk, én rad per person. Flere innsjekk samme dag teller ikke dobbelt. */
export function personerPaaPlassen<T extends PresenceRow>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const present: T[] = [];
  for (const row of rows) {
    if (row.checkedOutAt) continue;
    const key = (row.userId ?? row.name).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    present.push(row);
  }
  return present;
}
