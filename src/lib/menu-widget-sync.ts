/**
 * Mapping mellom dashboard meny-stier og widget-IDer.
 * Brukes for å sikre at enkel meny og dashboard-fliser er i synk
 * ved onboarding og tilbakestilling.
 */

const PATH_TO_WIDGET: Record<string, string> = {
  "/dashboard/hms-handbok": "hms-handbok",
  "/dashboard/hms-cockpit": "hms-cockpit",
  "/dashboard/incidents": "incidents",
  "/dashboard/risks": "risks",
  "/dashboard/rutiner": "routines",
  "/dashboard/inspections": "inspections",
  "/dashboard/training": "training",
  "/dashboard/fire-drills": "fire-safety",
  "/dashboard/annual-hms-plan": "annual-hms-plan",
  "/dashboard/sja": "sja",
  "/dashboard/chemicals": "chemicals",
  "/dashboard/exposure-register": "exposure-register",
  "/dashboard/construction-compliance": "construction-compliance",
  "/dashboard/ik-mat": "ik-mat",
  "/dashboard/aktivitetssikkerhet": "aktivitetssikkerhet",
  "/dashboard/transport": "transport",
  "/dashboard/bht-nattarbeid": "bht-nattarbeid",
  "/dashboard/beredskap-reiseliv": "beredskap-reiseliv",
  "/dashboard/documents": "documents",
  "/dashboard/actions": "actions",
  "/dashboard/audits": "audits",
  "/dashboard/goals": "goals",
  "/dashboard/meetings": "meetings",
  "/dashboard/environment": "environment",
  "/dashboard/wellbeing": "wellbeing",
  "/dashboard/feedback": "feedback",
  "/dashboard/complaints": "complaints",
  "/dashboard/time-registration": "absence",
  "/dashboard/organisasjonskart": "organization",
  "/dashboard/samsvarserklaringer": "electrical",
  "/dashboard/ruh": "ruh",
  "/dashboard/whistleblowing": "whistleblowing",
  "/dashboard/medarbeidersamtale": "employee-reviews",
  "/dashboard/projects": "projects",
  "/dashboard/risk-register": "risk-register",
  "/dashboard/management-reviews": "management-reviews",
  "/dashboard/juridisk-register": "legal-register",
  "/dashboard/benchmark": "widget-hms-score",
  "/dashboard/hms-pulse": "widget-hms-score",
}

const EXCLUDED_PATHS = new Set([
  "/dashboard",
  "/dashboard/settings",
  "/dashboard/support",
])

/**
 * Konverterer enkel-meny stier til widget-IDer for dashboard-fliser.
 * Sikrer at flisene speiler enkel meny 1:1 ved første oppsett.
 */
export function menuPathsToWidgetIds(menuPaths: string[]): string[] {
  const widgetIds: string[] = []
  const seen = new Set<string>()

  for (const path of menuPaths) {
    if (EXCLUDED_PATHS.has(path)) continue
    const widgetId = PATH_TO_WIDGET[path]
    if (widgetId && !seen.has(widgetId)) {
      seen.add(widgetId)
      widgetIds.push(widgetId)
    }
  }

  return widgetIds
}
