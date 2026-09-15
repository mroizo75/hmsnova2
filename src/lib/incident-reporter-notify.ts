/**
 * Varsler innsender om status, tildeling og lukking — ikke ved opprettelse.
 * IK-HMS § 5 nr. 7: den som melder skal kunne følge opp saken sin.
 * GDPR art. 5: innsender får kun egen sak, lenke går til ansattportalen.
 */

export type IncidentReporterEvent = "status" | "assigned" | "closed";

export function shouldNotifyIncidentReporter(opts: {
  reportedBy: string | null | undefined;
  actorId: string;
}): boolean {
  if (!opts.reportedBy) return false;
  return opts.reportedBy !== opts.actorId;
}

export function buildIncidentReporterNotification(opts: {
  event: IncidentReporterEvent;
  incidentId: string;
  typeLabel: string;
  title: string;
  statusLabel?: string;
}): {
  type: "INCIDENT_UPDATED" | "INCIDENT_CLOSED";
  title: string;
  message: string;
  link: string;
} {
  const link = `/ansatt/avvik/${opts.incidentId}`;
  const caseLabel = `${opts.typeLabel}: ${opts.title}`;

  if (opts.event === "closed") {
    return {
      type: "INCIDENT_CLOSED",
      title: "Avviket ditt er lukket",
      message: `${caseLabel} er behandlet og lukket.`,
      link,
    };
  }

  if (opts.event === "assigned") {
    return {
      type: "INCIDENT_UPDATED",
      title: "Avviket ditt er tildelt",
      message: `${caseLabel} er sendt videre til ny behandler.`,
      link,
    };
  }

  return {
    type: "INCIDENT_UPDATED",
    title: "Status på avviket ditt",
    message: opts.statusLabel
      ? `${caseLabel} – status er nå ${opts.statusLabel}.`
      : `${caseLabel} er oppdatert.`,
    link,
  };
}
