/**
 * Retter utdaterte internlenker og Lovdata-adresser i juridisk register.
 * Gamle stier som /dashboard/stoffkartotek gir 404 etter at rutene ble omdøpt.
 */

export const DASHBOARD_ROUTE_ALIASES: Record<string, string> = {
  "/dashboard/stoffkartotek": "/dashboard/chemicals",
  "/dashboard/opplaering": "/dashboard/training",
  "/dashboard/eksponering": "/dashboard/exposure-register",
  "/dashboard/sha-plan": "/dashboard/construction-compliance",
  "/dashboard/bht": "/dashboard/bht-nattarbeid",
  "/dashboard/timer": "/dashboard/time-registration",
  "/dashboard/haccp": "/dashboard/ik-mat/haccp",
  "/dashboard/allergen": "/dashboard/ik-mat/allergener",
  "/dashboard/brann": "/dashboard/fire-drills",
  "/dashboard/varsling": "/dashboard/whistleblowing",
  "/dashboard/avvik": "/dashboard/incidents",
  "/dashboard/avvik/ny": "/dashboard/incidents/new",
  "/dashboard/sja/ny": "/dashboard/sja/new",
  "/dashboard/vernerunder": "/dashboard/inspections",
  "/dashboard/dokumenter": "/dashboard/documents",
  "/dashboard/risiko": "/dashboard/risks",
  "/dashboard/tiltak": "/dashboard/actions",
  "/dashboard/beredskap-reiseliv": "/dashboard/beredskap",
};

export const LOVDATA_URL_REPLACEMENTS: Record<string, string> = {
  "https://lovdata.no/dokument/SF/forskrift/2001-04-30-443":
    "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1357/KAPITTEL_2",
  "https://lovdata.no/dokument/SF/forskrift/2013-12-18-1549":
    "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1358",
  "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1346":
    "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1358",
  "https://lovdata.no/dokument/NL/lov/2019-06-21-42":
    "https://lovdata.no/dokument/NL/lov/1999-07-02-63",
  "https://lovdata.no/dokument/LTI/forskrift/1997-12-19-1323":
    "https://lovdata.no/dokument/SF/forskrift/2012-06-16-622",
  "https://lovdata.no/dokument/SF/forskrift/2005-11-18-1419":
    "https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_10",
  "https://lovdata.no/dokument/SF/forskrift/2013-05-15-532":
    "https://lovdata.no/dokument/SF/forskrift/2012-06-16-622",
  "https://lovdata.no/nav/lov/2005-06-17-62/kap10":
    "https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_10",
};

const SHORT_LOV_RE = /^https:\/\/lovdata\.no\/lov\/(\d{4}-\d{2}-\d{2}-\d+)(?:\/.*)?$/;
const SHORT_FORSKRIFT_RE = /^https:\/\/lovdata\.no\/forskrift\/(\d{4}-\d{2}-\d{2}-\d+)(?:\/.*)?$/;

/** Gamle kravtitler som ble omdøpt i seed — brukes for å unngå duplikater. */
export const REQUIREMENT_TITLE_ALIASES: Record<string, string> = {
  Allergenoversikt: "Allergenoversikt og allergenrutine",
  "Brannvernrutine og rømningsplan": "Brannvernrutine, rømningsplan og brannøvelser",
};

export function canonicalRequirementTitle(title: string): string {
  return REQUIREMENT_TITLE_ALIASES[title] ?? title;
}

export function repairDashboardRoute(route: string | null | undefined): string | null {
  if (!route) return null;
  return DASHBOARD_ROUTE_ALIASES[route] ?? route;
}

export function repairLovdataUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const replaced = LOVDATA_URL_REPLACEMENTS[url];
  if (replaced) return replaced;

  const lovMatch = url.match(SHORT_LOV_RE);
  if (lovMatch) {
    return `https://lovdata.no/dokument/NL/lov/${lovMatch[1]}`;
  }
  const forskriftMatch = url.match(SHORT_FORSKRIFT_RE);
  if (forskriftMatch) {
    return `https://lovdata.no/dokument/SF/forskrift/${forskriftMatch[1]}`;
  }
  return url;
}
