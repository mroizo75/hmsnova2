/**
 * Sentralisert tilgangskontroll for HMS Nova 2.0
 * 
 * Dette definerer hva hver rolle kan gjøre i systemet
 */

import { Role } from "@prisma/client";

export interface RolePermissions {
  // Dashboard & Navigasjon
  canAccessDashboard: boolean;
  canViewAnalytics: boolean;
  
  // Dokumenter
  canReadDocuments: boolean;
  canCreateDocuments: boolean;
  canApproveDocuments: boolean;
  canDeleteDocuments: boolean;
  
  // Avvik & Hendelser
  canReadIncidents: boolean;
  canCreateIncidents: boolean;
  canInvestigateIncidents: boolean;
  canCloseIncidents: boolean;
  
  // Risikovurderinger
  canReadRisks: boolean;
  canCreateRisks: boolean;
  canApproveRisks: boolean;
  canDeleteRisks: boolean;
  
  // Tiltak/Actions
  canReadActions: boolean;
  canCreateActions: boolean;
  canUpdateActions: boolean;
  canDeleteActions: boolean;
  
  // Skjemaer
  canReadForms: boolean;
  canFillForms: boolean;
  canCreateForms: boolean;
  canManageForms: boolean;
  
  // Stoffkartotek
  canReadChemicals: boolean;
  canCreateChemicals: boolean;
  canUpdateChemicals: boolean;
  canDeleteChemicals: boolean;
  
  // Opplæring
  canReadOwnTraining: boolean;
  canReadAllTraining: boolean;
  canCreateTraining: boolean;
  canAssignTraining: boolean;
  canEvaluateTraining: boolean;
  
  // Revisjoner/Audits
  canReadAudits: boolean;
  canCreateAudits: boolean;
  canConductAudits: boolean;
  canCloseAudits: boolean;
  
  // Inspeksjoner/Vernerunde
  canReadInspections: boolean;
  canCreateInspections: boolean;
  canConductInspections: boolean;
  canCloseInspections: boolean;
  
  // Mål & KPIer
  canReadGoals: boolean;
  canCreateGoals: boolean;
  canUpdateGoals: boolean;
  canMeasureGoals: boolean;
  
  // Brukeradministrasjon (tenant)
  canReadUsers: boolean;
  canInviteUsers: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  
  // Innstillinger (tenant)
  canReadSettings: boolean;
  canUpdateSettings: boolean;
  
  // Rapporter & Eksport
  canExportReports: boolean;
  canViewAllReports: boolean;
}

/**
 * Definer tilganger for hver rolle
 */
export const rolePermissions: Record<Role, RolePermissions> = {
  // ADMIN - Full tilgang til alt
  ADMIN: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: true,
    canApproveDocuments: true,
    canDeleteDocuments: true,
    canReadIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRisks: true,
    canCreateRisks: true,
    canApproveRisks: true,
    canDeleteRisks: true,
    canReadActions: true,
    canCreateActions: true,
    canUpdateActions: true,
    canDeleteActions: true,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: true,
    canManageForms: true,
    canReadChemicals: true,
    canCreateChemicals: true,
    canUpdateChemicals: true,
    canDeleteChemicals: true,
    canReadOwnTraining: true,
    canReadAllTraining: true,
    canCreateTraining: true,
    canAssignTraining: true,
    canEvaluateTraining: true,
    canReadAudits: true,
    canCreateAudits: true,
    canConductAudits: true,
    canCloseAudits: true,
    canReadInspections: true,
    canCreateInspections: true,
    canConductInspections: true,
    canCloseInspections: true,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadUsers: true,
    canInviteUsers: true,
    canManageUsers: true,
    canDeleteUsers: true,
    canReadSettings: true,
    canUpdateSettings: true,
    canExportReports: true,
    canViewAllReports: true,
  },

  // HMS - HMS-ansvarlig, nesten full tilgang
  HMS: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: true,
    canApproveDocuments: true,
    canDeleteDocuments: false, // Kan ikke slette
    canReadIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRisks: true,
    canCreateRisks: true,
    canApproveRisks: true,
    canDeleteRisks: false,
    canReadActions: true,
    canCreateActions: true,
    canUpdateActions: true,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: true,
    canManageForms: true,
    canReadChemicals: true,
    canCreateChemicals: true,
    canUpdateChemicals: true,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: true,
    canCreateTraining: true,
    canAssignTraining: true,
    canEvaluateTraining: true,
    canReadAudits: true,
    canCreateAudits: true,
    canConductAudits: true,
    canCloseAudits: true,
    canReadInspections: true,
    canCreateInspections: true,
    canConductInspections: true,
    canCloseInspections: true,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadUsers: true,
    canInviteUsers: true,
    canManageUsers: true,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
  },

  // LEDER - Leder, kan administrere i sin avdeling
  LEDER: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: true,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRisks: true,
    canCreateRisks: true,
    canApproveRisks: false,
    canDeleteRisks: true,
    canReadActions: true,
    canCreateActions: true,
    canUpdateActions: true,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: true,
    canManageForms: true,
    canReadChemicals: true,
    canCreateChemicals: true,
    canUpdateChemicals: true,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: true,
    canCreateTraining: false,
    canAssignTraining: true,
    canEvaluateTraining: false,
    canReadAudits: true,
    canCreateAudits: false,
    canConductAudits: false,
    canCloseAudits: false,
    canReadInspections: true,
    canCreateInspections: true,
    canConductInspections: true,
    canCloseInspections: false,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadUsers: true,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
  },

  // VERNEOMBUD - Verneombud, fokus på HMS
  VERNEOMBUD: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRisks: true,
    canCreateRisks: true,
    canApproveRisks: false,
    canDeleteRisks: false,
    canReadActions: true,
    canCreateActions: true,
    canUpdateActions: false,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: false,
    canManageForms: false,
    canReadChemicals: true,
    canCreateChemicals: false,
    canUpdateChemicals: false,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: false,
    canCreateTraining: false,
    canAssignTraining: false,
    canEvaluateTraining: false,
    canReadAudits: true,
    canCreateAudits: false,
    canConductAudits: false,
    canCloseAudits: false,
    canReadInspections: true,
    canCreateInspections: true,
    canConductInspections: true,
    canCloseInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: false,
    canViewAllReports: false,
  },

  // ANSATT - Ansatt, begrenset tilgang
  ANSATT: {
    canAccessDashboard: true,
    canViewAnalytics: false,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: false, // Kun egne
    canCreateIncidents: true,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRisks: false,
    canCreateRisks: false,
    canApproveRisks: false,
    canDeleteRisks: false,
    canReadActions: false, // Kun egne
    canCreateActions: false,
    canUpdateActions: false,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: false,
    canManageForms: false,
    canReadChemicals: true,
    canCreateChemicals: false,
    canUpdateChemicals: false,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: false,
    canCreateTraining: false,
    canAssignTraining: false,
    canEvaluateTraining: false,
    canReadAudits: false,
    canCreateAudits: false,
    canConductAudits: false,
    canCloseAudits: false,
    canReadInspections: false,
    canCreateInspections: false,
    canConductInspections: false,
    canCloseInspections: false,
    canReadGoals: false,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: false,
    canViewAllReports: false,
  },

  // BHT - Bedriftshelsetjeneste, lesetilgang + rapportering
  BHT: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRisks: true,
    canCreateRisks: true,
    canApproveRisks: false,
    canDeleteRisks: false,
    canReadActions: true,
    canCreateActions: false,
    canUpdateActions: false,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: false,
    canManageForms: false,
    canReadChemicals: true,
    canCreateChemicals: false,
    canUpdateChemicals: false,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: true,
    canCreateTraining: false,
    canAssignTraining: false,
    canEvaluateTraining: false,
    canReadAudits: true,
    canCreateAudits: false,
    canConductAudits: false,
    canCloseAudits: false,
    canReadInspections: true,
    canCreateInspections: false,
    canConductInspections: false,
    canCloseInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
  },

  // REVISOR - Revisor, kun lesetilgang
  REVISOR: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: true,
    canCreateIncidents: false,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRisks: true,
    canCreateRisks: false,
    canApproveRisks: false,
    canDeleteRisks: false,
    canReadActions: true,
    canCreateActions: false,
    canUpdateActions: false,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: false,
    canCreateForms: false,
    canManageForms: false,
    canReadChemicals: true,
    canCreateChemicals: false,
    canUpdateChemicals: false,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: true,
    canCreateTraining: false,
    canAssignTraining: false,
    canEvaluateTraining: false,
    canReadAudits: true,
    canCreateAudits: false,
    canConductAudits: false,
    canCloseAudits: false,
    canReadInspections: true,
    canCreateInspections: false,
    canConductInspections: false,
    canCloseInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadUsers: true,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
  },
};

/**
 * Hent tilganger for en rolle
 */
export function getPermissions(role: Role): RolePermissions {
  return rolePermissions[role];
}

/**
 * Sjekk om en rolle har en spesifikk tilgang
 */
export function hasPermission(
  role: Role,
  permission: keyof RolePermissions
): boolean {
  return rolePermissions[role][permission];
}

/**
 * Hent synlig navigasjon for en rolle
 */
export function getVisibleNavItems(role: Role) {
  const perms = getPermissions(role);

  return {
    dashboard: perms.canAccessDashboard,
    documents: perms.canReadDocuments,
    forms: perms.canReadForms,
    risks: perms.canReadRisks,
    incidents: perms.canReadIncidents,
    inspections: perms.canReadInspections,
    chemicals: perms.canReadChemicals,
    training: perms.canReadOwnTraining || perms.canReadAllTraining,
    audits: perms.canReadAudits,
    actions: perms.canReadActions,
    goals: perms.canReadGoals,
    settings: perms.canReadSettings,
  };
}

/**
 * Hent rolle-navn på norsk
 */
export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    ADMIN: "Administrator",
    HMS: "HMS-ansvarlig",
    LEDER: "Leder",
    VERNEOMBUD: "Verneombud",
    ANSATT: "Ansatt",
    BHT: "Bedriftshelsetjeneste",
    REVISOR: "Revisor",
  };
  return roleNames[role];
}

/**
 * Hent rolle-beskrivelse
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    ADMIN: "Full tilgang til alle funksjoner i bedriften",
    HMS: "Administrerer HMS-systemet og har full tilgang til HMS-relaterte funksjoner",
    LEDER: "Kan administrere sin avdeling og håndtere HMS-oppgaver",
    VERNEOMBUD: "Kan rapportere avvik, risikovurderinger og delta i HMS-arbeid",
    ANSATT: "Kan rapportere avvik, fylle ut skjemaer og lese dokumenter",
    BHT: "Lesetilgang til alt og kan rapportere hendelser og risikovurderinger",
    REVISOR: "Kun lesetilgang til alle HMS-data for revisjonsformål",
  };
  return descriptions[role];
}

