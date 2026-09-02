/**
 * Felles konfigurasjon for dashboard-meny.
 * Brukes av sidebar, mobil-meny og innstillinger for enkel meny.
 */

import type { TenantFeature } from "@/lib/tenant-features";

export type NavPermission =
  | "dashboard"
  | "documents"
  | "routines"
  | "legalRegister"
  | "incidents"
  | "hseStatistics"
  | "exposureRegister"
  | "sja"
  | "inspections"
  | "training"
  | "actions"
  | "chemicals"
  | "risks"
  | "feedback"
  | "environment"
  | "audits"
  | "managementReviews"
  | "annualHmsPlan"
  | "meetings"
  | "timeRegistration"
  | "whistleblowing"
  | "confidentialTasks"
  | "goals"
  | "constructionCompliance"
  | "hmsTavle"
  | "hmsHandbok"
  | "employeeReviews"
  | "settings"
  | "ikMat"
  | "skjenking"
  | "aktivitetssikkerhet"
  | "transport"
  | "bhtNattarbeid"
  | "beredskap"
  | "absence"
  | "boarding"
  | "personnelArchive"
  | "support"
  | "benchmark"
  | "hmsCockpit";

/**
 * Forenklet Core-hub-gruppering for menyen (5 hubber + tilleggsmoduler).
 * Endrer kun IA/gruppering i menyen - ingen endring i URL-er eller sider.
 */
export type CoreHub =
  | "oversikt"
  | "risiko"
  | "avvikTiltak"
  | "handbok"
  | "organisasjon"
  | "tilleggsmoduler";

export const CORE_HUB_ORDER: CoreHub[] = [
  "oversikt",
  "handbok",
  "risiko",
  "avvikTiltak",
  "organisasjon",
  "tilleggsmoduler",
];

export interface DashboardNavItemConfig {
  href: string;
  label: string;
  permission: NavPermission;
  defaultSimple: boolean;
  alwaysShow?: boolean;
  feature?: TenantFeature;
  /** Vises bare for disse bransjene (små bokstaver, f.eks. hospitality). */
  industries?: string[];
  /** Vises bare for HMS-brukere i et konsern (f.eks. konsernmeldinger). */
  requiresKonsern?: boolean;
  /** Hvilken av de 5 core-hubbene (+ tilleggsmoduler) elementet grupperes under i menyen. */
  coreHub: CoreHub;
}

export const DASHBOARD_NAV_CONFIG: DashboardNavItemConfig[] = [
  { href: "/dashboard", label: "nav.dashboard", permission: "dashboard", defaultSimple: true, coreHub: "oversikt" },
  { href: "/dashboard/meldinger", label: "nav.meldinger", permission: "dashboard", defaultSimple: false, alwaysShow: true, requiresKonsern: true, coreHub: "oversikt" },
  { href: "/dashboard/hms-cockpit", label: "nav.hmsCockpit", permission: "hmsCockpit", defaultSimple: true, coreHub: "oversikt" },
  { href: "/dashboard/goals", label: "nav.goals", permission: "goals", defaultSimple: false, coreHub: "oversikt" },
  { href: "/dashboard/benchmark", label: "nav.benchmark", permission: "benchmark", defaultSimple: false, coreHub: "oversikt" },
  { href: "/dashboard/support", label: "nav.support", permission: "support", defaultSimple: true, alwaysShow: true, coreHub: "oversikt" },

  { href: "/dashboard/hms-handbok", label: "nav.hmsHandbok", permission: "hmsHandbok", defaultSimple: true, coreHub: "handbok" },
  { href: "/dashboard/documents", label: "nav.documents", permission: "documents", defaultSimple: true, coreHub: "handbok" },
  { href: "/dashboard/rutiner", label: "nav.routines", permission: "routines", defaultSimple: true, coreHub: "handbok" },
  { href: "/dashboard/samsvarserklaringer", label: "nav.electro", permission: "documents", defaultSimple: true, coreHub: "handbok" },
  { href: "/dashboard/juridisk-register", label: "nav.legalRegister", permission: "legalRegister", defaultSimple: true, coreHub: "handbok" },
  { href: "/dashboard/annual-hms-plan", label: "nav.annualHmsPlan", permission: "annualHmsPlan", defaultSimple: true, coreHub: "handbok" },

  { href: "/dashboard/sja", label: "nav.sja", permission: "sja", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/inspections", label: "nav.inspections", permission: "inspections", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/fire-drills", label: "nav.fireDrills", permission: "inspections", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/chemicals", label: "nav.chemicals", permission: "chemicals", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/exposure-register", label: "nav.exposureRegister", permission: "exposureRegister", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/risks", label: "nav.risks", permission: "risks", defaultSimple: false, coreHub: "risiko" },
  { href: "/dashboard/risk-register", label: "nav.riskRegister", permission: "risks", defaultSimple: false, coreHub: "risiko" },
  { href: "/dashboard/wellbeing", label: "nav.wellbeing", permission: "inspections", defaultSimple: true, coreHub: "risiko" },
  { href: "/dashboard/environment", label: "nav.environment", permission: "environment", defaultSimple: false, coreHub: "risiko" },
  { href: "/dashboard/bcm", label: "nav.bcm", permission: "audits", defaultSimple: false, coreHub: "risiko" },
  { href: "/dashboard/audits", label: "nav.audits", permission: "audits", defaultSimple: false, coreHub: "risiko" },

  { href: "/dashboard/incidents", label: "nav.incidents", permission: "incidents", defaultSimple: true, coreHub: "avvikTiltak" },
  { href: "/dashboard/projects", label: "nav.projects", permission: "incidents", defaultSimple: true, coreHub: "avvikTiltak" },
  { href: "/dashboard/construction-compliance", label: "nav.constructionCompliance", permission: "constructionCompliance", defaultSimple: true, coreHub: "avvikTiltak" },
  { href: "/dashboard/hms-tavle", label: "nav.hmsTavle", permission: "hmsTavle", defaultSimple: true, coreHub: "avvikTiltak" },
  { href: "/dashboard/incidents/statistics", label: "nav.hseStatistics", permission: "hseStatistics", defaultSimple: false, feature: "trir", coreHub: "avvikTiltak" },
  { href: "/dashboard/actions", label: "nav.actions", permission: "actions", defaultSimple: true, coreHub: "avvikTiltak" },
  { href: "/dashboard/complaints", label: "nav.complaints", permission: "incidents", defaultSimple: false, coreHub: "avvikTiltak" },
  { href: "/dashboard/feedback", label: "nav.feedback", permission: "feedback", defaultSimple: false, coreHub: "avvikTiltak" },
  { href: "/dashboard/whistleblowing", label: "nav.whistleblowing", permission: "whistleblowing", defaultSimple: true, alwaysShow: true, coreHub: "avvikTiltak" },
  { href: "/konfidensielt", label: "nav.confidentialTasks", permission: "confidentialTasks", defaultSimple: true, alwaysShow: true, coreHub: "avvikTiltak" },

  { href: "/dashboard/training", label: "nav.training", permission: "training", defaultSimple: true, coreHub: "organisasjon" },
  { href: "/dashboard/management-reviews", label: "nav.managementReviews", permission: "managementReviews", defaultSimple: false, coreHub: "organisasjon" },
  { href: "/dashboard/meetings", label: "nav.meetings", permission: "meetings", defaultSimple: false, coreHub: "organisasjon" },
  { href: "/dashboard/time-registration", label: "nav.timeRegistration", permission: "timeRegistration", defaultSimple: true, coreHub: "organisasjon" },
  { href: "/dashboard/fravaer", label: "nav.absence", permission: "absence", defaultSimple: true, coreHub: "organisasjon" },
  { href: "/dashboard/onboarding", label: "nav.boarding", permission: "boarding", defaultSimple: false, coreHub: "organisasjon" },
  { href: "/dashboard/personalarkiv", label: "nav.personnelArchive", permission: "personnelArchive", defaultSimple: true, coreHub: "organisasjon" },
  { href: "/dashboard/medarbeidersamtale", label: "nav.employeeReviews", permission: "employeeReviews", defaultSimple: false, coreHub: "organisasjon" },
  { href: "/dashboard/brukere", label: "nav.users", permission: "settings", defaultSimple: true, alwaysShow: true, coreHub: "organisasjon" },
  { href: "/dashboard/organisasjonskart", label: "nav.orgChart", permission: "settings", defaultSimple: true, alwaysShow: true, coreHub: "organisasjon" },
  { href: "/dashboard/aktivitetslogg", label: "nav.aktivitetslogg", permission: "settings", defaultSimple: false, alwaysShow: true, coreHub: "organisasjon" },
  { href: "/dashboard/settings", label: "nav.settings", permission: "settings", defaultSimple: true, alwaysShow: true, coreHub: "organisasjon" },

  { href: "/dashboard/ik-mat", label: "nav.ikMat", permission: "ikMat", defaultSimple: false, coreHub: "tilleggsmoduler" },
  { href: "/dashboard/skjenking", label: "nav.skjenking", permission: "skjenking", defaultSimple: false, coreHub: "tilleggsmoduler" },
  { href: "/dashboard/beredskap", label: "nav.beredskap", permission: "beredskap", defaultSimple: true, coreHub: "tilleggsmoduler" },
  { href: "/dashboard/aktivitetssikkerhet", label: "nav.aktivitetssikkerhet", permission: "aktivitetssikkerhet", defaultSimple: false, coreHub: "tilleggsmoduler" },
  { href: "/dashboard/transport", label: "nav.transport", permission: "transport", defaultSimple: false, coreHub: "tilleggsmoduler" },
  { href: "/dashboard/bht-nattarbeid", label: "nav.bhtNattarbeid", permission: "bhtNattarbeid", defaultSimple: false, coreHub: "tilleggsmoduler" },
];

export const DEFAULT_SIMPLE_MENU_HREFS = DASHBOARD_NAV_CONFIG.filter((i) => i.defaultSimple).map(
  (i) => i.href
);
