/**
 * Felles konfigurasjon for dashboard-meny.
 * Brukes av sidebar, mobil-meny og innstillinger for enkel meny.
 */

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
  | "goals"
  | "constructionCompliance"
  | "hmsTavle"
  | "hmsHandbok"
  | "employeeReviews"
  | "settings"
  | "ikMat"
  | "aktivitetssikkerhet"
  | "transport"
  | "bhtNattarbeid"
  | "support"
  | "benchmark"
  | "hmsCockpit";

export interface DashboardNavItemConfig {
  href: string;
  label: string;
  permission: NavPermission;
  defaultSimple: boolean;
}

export const DASHBOARD_NAV_CONFIG: DashboardNavItemConfig[] = [
  { href: "/dashboard", label: "nav.dashboard", permission: "dashboard", defaultSimple: true },
  { href: "/dashboard/hms-handbok", label: "nav.hmsHandbok", permission: "hmsHandbok", defaultSimple: true },
  { href: "/dashboard/documents", label: "nav.documents", permission: "documents", defaultSimple: true },
  { href: "/dashboard/rutiner", label: "nav.routines", permission: "routines", defaultSimple: true },
  { href: "/dashboard/samsvarserklaringer", label: "nav.electro", permission: "documents", defaultSimple: true },
  { href: "/dashboard/juridisk-register", label: "nav.legalRegister", permission: "legalRegister", defaultSimple: true },
  { href: "/dashboard/incidents", label: "nav.incidents", permission: "incidents", defaultSimple: true },
  { href: "/dashboard/projects", label: "nav.projects", permission: "incidents", defaultSimple: true },
  { href: "/dashboard/incidents/statistics", label: "nav.hseStatistics", permission: "hseStatistics", defaultSimple: false },
  { href: "/dashboard/sja", label: "nav.sja", permission: "sja", defaultSimple: true },
  { href: "/dashboard/inspections", label: "nav.inspections", permission: "inspections", defaultSimple: true },
  { href: "/dashboard/fire-drills", label: "nav.fireDrills", permission: "inspections", defaultSimple: true },
  { href: "/dashboard/training", label: "nav.training", permission: "training", defaultSimple: true },
  { href: "/dashboard/actions", label: "nav.actions", permission: "actions", defaultSimple: true },
  { href: "/dashboard/chemicals", label: "nav.chemicals", permission: "chemicals", defaultSimple: true },
  { href: "/dashboard/exposure-register", label: "nav.exposureRegister", permission: "exposureRegister", defaultSimple: true },
  { href: "/dashboard/risks", label: "nav.risks", permission: "risks", defaultSimple: false },
  { href: "/dashboard/risk-register", label: "nav.riskRegister", permission: "risks", defaultSimple: false },
  { href: "/dashboard/wellbeing", label: "nav.wellbeing", permission: "inspections", defaultSimple: true },
  { href: "/dashboard/complaints", label: "nav.complaints", permission: "incidents", defaultSimple: false },
  { href: "/dashboard/feedback", label: "nav.feedback", permission: "feedback", defaultSimple: false },
  { href: "/dashboard/environment", label: "nav.environment", permission: "environment", defaultSimple: false },
  { href: "/dashboard/bcm", label: "nav.bcm", permission: "audits", defaultSimple: false },
  { href: "/dashboard/audits", label: "nav.audits", permission: "audits", defaultSimple: false },
  { href: "/dashboard/management-reviews", label: "nav.managementReviews", permission: "managementReviews", defaultSimple: false },
  { href: "/dashboard/annual-hms-plan", label: "nav.annualHmsPlan", permission: "annualHmsPlan", defaultSimple: true },
  { href: "/dashboard/meetings", label: "nav.meetings", permission: "meetings", defaultSimple: false },
  { href: "/dashboard/time-registration", label: "nav.timeRegistration", permission: "timeRegistration", defaultSimple: true },
  { href: "/dashboard/construction-compliance", label: "nav.constructionCompliance", permission: "constructionCompliance", defaultSimple: true },
  { href: "/dashboard/hms-tavle", label: "nav.hmsTavle", permission: "hmsTavle", defaultSimple: true },
  { href: "/dashboard/ik-mat", label: "nav.ikMat", permission: "ikMat", defaultSimple: false },
  { href: "/dashboard/beredskap-reiseliv", label: "nav.beredskapReiseliv", permission: "inspections", defaultSimple: false },
  { href: "/dashboard/aktivitetssikkerhet", label: "nav.aktivitetssikkerhet", permission: "aktivitetssikkerhet", defaultSimple: false },
  { href: "/dashboard/transport", label: "nav.transport", permission: "transport", defaultSimple: false },
  { href: "/dashboard/bht-nattarbeid", label: "nav.bhtNattarbeid", permission: "bhtNattarbeid", defaultSimple: false },
  { href: "/dashboard/medarbeidersamtale", label: "nav.employeeReviews", permission: "employeeReviews", defaultSimple: false },
  { href: "/dashboard/whistleblowing", label: "nav.whistleblowing", permission: "whistleblowing", defaultSimple: false },
  { href: "/dashboard/goals", label: "nav.goals", permission: "goals", defaultSimple: false },
  { href: "/dashboard/organisasjonskart", label: "nav.orgChart", permission: "settings", defaultSimple: true },
  { href: "/dashboard/hms-cockpit", label: "nav.hmsCockpit", permission: "hmsCockpit", defaultSimple: true },
  { href: "/dashboard/benchmark", label: "nav.benchmark", permission: "benchmark", defaultSimple: false },
  { href: "/dashboard/support", label: "nav.support", permission: "support", defaultSimple: true },
  { href: "/dashboard/settings", label: "nav.settings", permission: "settings", defaultSimple: true },
];

export const DEFAULT_SIMPLE_MENU_HREFS = DASHBOARD_NAV_CONFIG.filter((i) => i.defaultSimple).map(
  (i) => i.href
);
