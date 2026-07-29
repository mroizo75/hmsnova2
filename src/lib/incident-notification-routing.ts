/**
 * Varslingshierarki for avvik.
 *
 * AML § 3-1 krever at HMS-ansvaret er plassert i linjen, og at avvik behandles av den
 * som faktisk har myndighet til å iverksette tiltak. Internkontrollforskriften § 5 nr. 7
 * krever at avvik følges opp systematisk. Kaskaden nedenfor sikrer at et avvik alltid
 * havner hos noen, også når virksomheten ikke har fylt ut lederhierarkiet:
 *
 *   1. Prosjektleder for prosjektet avviket gjelder (en ansatt jobber under ulike
 *      prosjektledere på ulike prosjekter, så prosjektet har forrang)
 *   2. Melderens nærmeste leder
 *   3. Dagens rollebaserte varsling (ADMIN/HMS/LEDER)
 *
 * HMS-ansvarlige er alltid på kopi. Melderen varsles aldri som mottaker av sitt eget avvik.
 *
 * Oppslagene er injiserbare slik at kaskaden kan testes uten database.
 */

export type IncidentRecipientSource = "PROJECT_MANAGER" | "LINE_MANAGER" | "ROLES";

export interface IncidentRoutingLookups {
  /** Prosjektleder for prosjektet, validert mot samme tenant. Null hvis ikke satt. */
  getProjectManagerId(projectId: string): Promise<string | null>;
  /** Nærmeste leder for en ansatt i denne tenanten. Null hvis ikke satt. */
  getManagerId(userId: string): Promise<string | null>;
  /** Brukere med en av rollene, innen samme tenant. */
  getUserIdsByRoles(roles: readonly string[]): Promise<string[]>;
}

export interface IncidentRoutingInput {
  reporterId: string;
  projectId: string | null;
  /** Rollene som varsles når verken prosjektleder eller nærmeste leder finnes. */
  fallbackRoles: readonly string[];
  /** Rollene som alltid legges på kopi. Standard er HMS. */
  copyRoles?: readonly string[];
}

export interface IncidentRoutingResult {
  /** Hovedmottakere. Kan være tom hvis ingen roller er konfigurert. */
  recipientIds: string[];
  /** Mottakere på kopi. Overlapper aldri med recipientIds. */
  copyRecipientIds: string[];
  source: IncidentRecipientSource;
}

const DEFAULT_COPY_ROLES = ["HMS"] as const;

/** Maks antall ledd vi følger oppover før vi antar en syklus i lederkjeden. */
const MAX_MANAGER_CHAIN_DEPTH = 20;

export async function resolveIncidentRecipients(
  input: IncidentRoutingInput,
  lookups: IncidentRoutingLookups
): Promise<IncidentRoutingResult> {
  if (!input.reporterId) {
    throw new Error("reporterId er påkrevd for å rute avviksvarsling");
  }

  let recipientIds: string[] = [];
  let source: IncidentRecipientSource = "ROLES";

  if (input.projectId) {
    const projectManagerId = await lookups.getProjectManagerId(input.projectId);
    if (projectManagerId && projectManagerId !== input.reporterId) {
      recipientIds = [projectManagerId];
      source = "PROJECT_MANAGER";
    }
  }

  if (recipientIds.length === 0) {
    const managerId = await lookups.getManagerId(input.reporterId);
    if (managerId && managerId !== input.reporterId) {
      recipientIds = [managerId];
      source = "LINE_MANAGER";
    }
  }

  if (recipientIds.length === 0) {
    recipientIds = await lookups.getUserIdsByRoles(input.fallbackRoles);
    source = "ROLES";
  }

  const copyRoles = input.copyRoles ?? DEFAULT_COPY_ROLES;
  const copyCandidates = copyRoles.length > 0 ? await lookups.getUserIdsByRoles(copyRoles) : [];

  const uniqueRecipients = dedupeWithout(recipientIds, [input.reporterId]);
  const uniqueCopies = dedupeWithout(copyCandidates, [input.reporterId, ...uniqueRecipients]);

  return { recipientIds: uniqueRecipients, copyRecipientIds: uniqueCopies, source };
}

function dedupeWithout(ids: readonly string[], excluded: readonly string[]): string[] {
  const excludedSet = new Set(excluded);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of ids) {
    if (!id || excludedSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

/**
 * Hindrer at lederkjeden går i ring, f.eks. at A er leder for B som er leder for A.
 * Kastes før lagring av nærmeste leder.
 */
export async function assertNoManagerCycle(
  userId: string,
  candidateManagerId: string,
  getManagerId: (userId: string) => Promise<string | null>
): Promise<void> {
  if (userId === candidateManagerId) {
    throw new Error("En ansatt kan ikke være sin egen leder");
  }

  let current: string | null = candidateManagerId;
  let depth = 0;

  while (current) {
    if (current === userId) {
      throw new Error("Lederkjeden går i ring. Velg en annen nærmeste leder");
    }
    if (++depth > MAX_MANAGER_CHAIN_DEPTH) {
      throw new Error("Lederkjeden er for dyp. Kontroller oppsettet av nærmeste ledere");
    }
    current = await getManagerId(current);
  }
}
