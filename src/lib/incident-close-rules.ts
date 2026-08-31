/**
 * Lukking av avvik.
 * Hjemmel: Internkontrollforskriften § 5 nr. 7 (avdekke, rette opp og
 * forebygge) og ISO 9001:2015 / ISO 45001:2018 kap. 10.2 (korrigerende
 * tiltak og gjennomgang av effekt). Loven bruker ikke «behandlet» eller
 * «ferdig» som sluttstatus — avviket er ferdig når det er lukket.
 */

export const INCIDENT_TREATMENT_STATUSES = ["OPEN", "INVESTIGATING", "ACTION_TAKEN"] as const;

export type IncidentCloseInput = {
  status: string;
  rootCause: string | null | undefined;
  measures: Array<{ status: string }>;
};

export function getIncidentCloseBlockers(incident: IncidentCloseInput): string[] {
  const blockers: string[] = [];

  if (incident.status === "CLOSED") {
    blockers.push("Avviket er allerede lukket");
    return blockers;
  }

  if (!incident.rootCause?.trim()) {
    blockers.push("Årsaksanalyse mangler");
  }

  if (incident.measures.length === 0) {
    blockers.push("Ingen korrigerende tiltak er registrert");
  } else if (incident.measures.some((measure) => measure.status !== "DONE")) {
    blockers.push("Ikke alle tiltak er gjennomført");
  }

  return blockers;
}

export function canCloseIncident(incident: IncidentCloseInput): boolean {
  return getIncidentCloseBlockers(incident).length === 0;
}
