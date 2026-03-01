/**
 * Felles konfigurasjon for dashboard-meny.
 * Brukes av sidebar, mobil-meny og innstillinger for enkel meny.
 */

export type NavPermission =
  | "dashboard"
  | "documents"
  | "legalRegister"
  | "incidents"
  | "ruh"
  | "sja"
  | "inspections"
  | "training"
  | "actions"
  | "chemicals"
  | "forms"
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
  | "settings";

export interface DashboardNavItemConfig {
  href: string;
  label: string;
  permission: NavPermission;
  defaultSimple: boolean;
}

export const DASHBOARD_NAV_CONFIG: DashboardNavItemConfig[] = [
  { href: "/dashboard", label: "nav.dashboard", permission: "dashboard", defaultSimple: true },
  { href: "/dashboard/documents", label: "nav.documents", permission: "documents", defaultSimple: true },
  { href: "/dashboard/juridisk-register", label: "nav.legalRegister", permission: "legalRegister", defaultSimple: true },
  { href: "/dashboard/incidents", label: "nav.incidents", permission: "incidents", defaultSimple: true },
  { href: "/dashboard/ruh", label: "nav.ruh", permission: "ruh", defaultSimple: true },
  { href: "/dashboard/sja", label: "nav.sja", permission: "sja", defaultSimple: true },
  { href: "/dashboard/inspections", label: "nav.inspections", permission: "inspections", defaultSimple: true },
  { href: "/dashboard/training", label: "nav.training", permission: "training", defaultSimple: true },
  { href: "/dashboard/actions", label: "nav.actions", permission: "actions", defaultSimple: true },
  { href: "/dashboard/chemicals", label: "nav.chemicals", permission: "chemicals", defaultSimple: true },
  { href: "/dashboard/forms", label: "nav.forms", permission: "forms", defaultSimple: false },
  { href: "/dashboard/risks", label: "nav.risks", permission: "risks", defaultSimple: false },
  { href: "/dashboard/risk-register", label: "nav.riskRegister", permission: "risks", defaultSimple: false },
  { href: "/dashboard/wellbeing", label: "nav.wellbeing", permission: "forms", defaultSimple: true },
  { href: "/dashboard/complaints", label: "nav.complaints", permission: "incidents", defaultSimple: false },
  { href: "/dashboard/feedback", label: "nav.feedback", permission: "feedback", defaultSimple: false },
  { href: "/dashboard/environment", label: "nav.environment", permission: "environment", defaultSimple: false },
  { href: "/dashboard/bcm", label: "nav.bcm", permission: "audits", defaultSimple: false },
  { href: "/dashboard/audits", label: "nav.audits", permission: "audits", defaultSimple: false },
  { href: "/dashboard/management-reviews", label: "nav.managementReviews", permission: "managementReviews", defaultSimple: false },
  { href: "/dashboard/annual-hms-plan", label: "nav.annualHmsPlan", permission: "annualHmsPlan", defaultSimple: true },
  { href: "/dashboard/meetings", label: "nav.meetings", permission: "meetings", defaultSimple: false },
  { href: "/dashboard/time-registration", label: "nav.timeRegistration", permission: "timeRegistration", defaultSimple: true },
  { href: "/dashboard/whistleblowing", label: "nav.whistleblowing", permission: "whistleblowing", defaultSimple: false },
  { href: "/dashboard/goals", label: "nav.goals", permission: "goals", defaultSimple: false },
  { href: "/dashboard/settings", label: "nav.settings", permission: "settings", defaultSimple: true },
];

export const DEFAULT_SIMPLE_MENU_HREFS = DASHBOARD_NAV_CONFIG.filter((i) => i.defaultSimple).map(
  (i) => i.href
);
