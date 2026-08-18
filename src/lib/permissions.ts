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
  canReadIncidents: boolean;      // Lese ALLE avvik (behandlere)
  canReadOwnIncidents: boolean;   // Lese egne innsendte avvik (alle som kan rapportere)
  canCreateIncidents: boolean;
  canInvestigateIncidents: boolean;
  canCloseIncidents: boolean;
  
  // RUH – Rapport om uønsket hendelse
  canReadRuh: boolean;            // Lese ALLE RUH-rapporter (behandlere)
  canReadOwnRuh: boolean;         // Lese egne innsendte RUH (alle som kan rapportere)
  canCreateRuh: boolean;
  canHandleRuh: boolean;

  // SJA – Sikker Jobb Analyse
  canReadSja: boolean;            // Lese ALLE SJA-analyser (behandlere)
  canReadOwnSja: boolean;         // Lese egne opprettede SJA (alle som kan opprette)
  canCreateSja: boolean;
  canApproveSja: boolean;
  
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
  canReadAllFormSubmissions: boolean;  // Lese ALLE innsendinger (behandlere)
  canReadOwnFormSubmissions: boolean;  // Lese egne skjemainnsendinger

  // Rutiner
  canReadRoutines: boolean;
  canCreateRoutines: boolean;
  canManageRoutines: boolean;
  
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
  canDeleteInspections: boolean;

  // Miljøstyring (ISO 14001)
  canReadEnvironment: boolean;
  canCreateEnvironment: boolean;
  canUpdateEnvironment: boolean;
  canRecordEnvironmentalMeasurements: boolean;

  // Mål & KPIer
  canReadGoals: boolean;
  canCreateGoals: boolean;
  canUpdateGoals: boolean;
  canMeasureGoals: boolean;
  
  // Kundetilbakemelding
  canReadOwnFeedback: boolean;
  canReadAllFeedback: boolean;
  canCreateFeedback: boolean;
  canManageFeedback: boolean;
  
  // Ledelsens gjennomgang (Management Review)
  canReadManagementReviews: boolean;
  canCreateManagementReviews: boolean;
  canApproveManagementReviews: boolean;
  
  // AMU/VO Møter
  canReadMeetings: boolean;
  canCreateMeetings: boolean;
  canOrganizeMeetings: boolean;
  canViewAllMeetings: boolean;
  
  // Varsling (Whistleblowing)
  canSubmitWhistleblowing: boolean; // Alle kan sende inn
  canViewWhistleblowing: boolean; // Kun Admin/HMS
  canHandleWhistleblowing: boolean; // Kun Admin/HMS
  
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

  // Timeregistrering (prosjekter, timer, kjøring)
  canAccessTimeRegistration: boolean;

  // Juridisk register – lover og forskrifter per bransje (alle roller)
  canReadLegalRegister: boolean;

  // Eksponeringsregister – ansatte eksponert for helseskadelige stoffer
  canReadExposureRegister: boolean;
  canManageExposureRegister: boolean;

  // Bygg/anlegg-compliance – SHA, forhåndsmelding, oversiktsliste
  canReadConstructionCompliance: boolean;
  canManageConstructionCompliance: boolean;

  // Digital HMS Tavle – bygg og anlegg
  canViewHmsTavle: boolean;     // Se tavle og innhold
  canManageHmsTavle: boolean;   // Opprette, redigere, konfigurere tavler
  canReviewSubmissions: boolean; // Behandle UE-innsendinger

  // Medarbeidersamtale (AML § 4-2, § 4-3)
  canReadOwnEmployeeReviews: boolean;  // Se egne samtaler (ansatt)
  canReadAllEmployeeReviews: boolean;  // Se alle samtaler i tenant (admin/HMS)
  canCreateEmployeeReviews: boolean;   // Opprette nye samtaler (leder/admin/HMS)
  canConductEmployeeReviews: boolean;  // Fylle ut referat og gjennomføre (leder/admin/HMS)
  canDeleteEmployeeReviews: boolean;   // Slette samtaler (kun admin)
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
    canReadOwnIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: true,
    canHandleRuh: true,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: true,
    canApproveSja: true,
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
    canCreateForms: false,
    canManageForms: false,
    canReadAllFormSubmissions: true,
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: true,
    canManageRoutines: true,
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
    canDeleteInspections: true,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadOwnFeedback: true,
    canReadAllFeedback: true,
    canCreateFeedback: true,
    canManageFeedback: true,
    canReadEnvironment: true,
    canCreateEnvironment: true,
    canUpdateEnvironment: true,
    canRecordEnvironmentalMeasurements: true,
    canReadManagementReviews: true,
    canCreateManagementReviews: true,
    canApproveManagementReviews: true,
    canReadMeetings: true,
    canCreateMeetings: true,
    canOrganizeMeetings: true,
    canViewAllMeetings: true,
    canSubmitWhistleblowing: true,
    canViewWhistleblowing: true,
    canHandleWhistleblowing: true,
    canReadUsers: true,
    canInviteUsers: true,
    canManageUsers: true,
    canDeleteUsers: true,
    canReadSettings: true,
    canUpdateSettings: true,
    canExportReports: true,
    canViewAllReports: true,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: true,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: true,
    canViewHmsTavle: true,
    canManageHmsTavle: true,
    canReviewSubmissions: true,
    canReadOwnEmployeeReviews: true,
    canReadAllEmployeeReviews: true,
    canCreateEmployeeReviews: true,
    canConductEmployeeReviews: true,
    canDeleteEmployeeReviews: true,
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
    canReadOwnIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: true,
    canHandleRuh: true,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: true,
    canApproveSja: true,
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
    canCreateForms: false,
    canManageForms: false,
    canReadAllFormSubmissions: true,
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: true,
    canManageRoutines: true,
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
    canDeleteInspections: false,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadOwnFeedback: true,
    canReadAllFeedback: true,
    canCreateFeedback: true,
    canManageFeedback: true,
    canReadEnvironment: true,
    canCreateEnvironment: true,
    canUpdateEnvironment: true,
    canRecordEnvironmentalMeasurements: true,
    canReadManagementReviews: true,
    canCreateManagementReviews: true,
    canApproveManagementReviews: false, // Kun Admin
    canReadMeetings: true,
    canCreateMeetings: true,
    canOrganizeMeetings: true,
    canViewAllMeetings: true,
    canSubmitWhistleblowing: true,
    canViewWhistleblowing: true,
    canHandleWhistleblowing: true,
    canReadUsers: true,
    canInviteUsers: true,
    canManageUsers: true,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: true,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: true,
    canViewHmsTavle: true,
    canManageHmsTavle: true,
    canReviewSubmissions: true,
    // HMS-ansvarlig kan se egne samtaler og de de leder, men ikke alle andre ansatters.
    // Admin kan gi HMS full tilgang via adgangskontroll (moduleVisibilityConfig).
    canReadOwnEmployeeReviews: true,
    canReadAllEmployeeReviews: false,
    canCreateEmployeeReviews: true,
    canConductEmployeeReviews: true,
    canDeleteEmployeeReviews: false,
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
    canReadOwnIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: true,
    canCloseIncidents: true,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: true,
    canHandleRuh: true,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: true,
    canApproveSja: true,
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
    canCreateForms: false,
    canManageForms: false,
    canReadAllFormSubmissions: true,
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: true,
    canManageRoutines: true,
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
    canDeleteInspections: false,
    canReadGoals: true,
    canCreateGoals: true,
    canUpdateGoals: true,
    canMeasureGoals: true,
    canReadOwnFeedback: true,
    canReadAllFeedback: true,
    canCreateFeedback: true,
    canManageFeedback: true,
    canReadEnvironment: true,
    canCreateEnvironment: true,
    canUpdateEnvironment: true,
    canRecordEnvironmentalMeasurements: true,
    canReadManagementReviews: true,
    canCreateManagementReviews: false,
    canApproveManagementReviews: false,
    canReadMeetings: true,
    canCreateMeetings: true,
    canOrganizeMeetings: true,
    canViewAllMeetings: false, // Kun egne møter
    canSubmitWhistleblowing: true,
    canViewWhistleblowing: false,
    canHandleWhistleblowing: false,
    canReadUsers: true,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: true,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: true,
    canViewHmsTavle: true,
    canManageHmsTavle: true,
    canReviewSubmissions: true,
    canReadOwnEmployeeReviews: true,
    canReadAllEmployeeReviews: false, // Kun egne
    canCreateEmployeeReviews: true,   // Leder kan opprette
    canConductEmployeeReviews: true,  // Leder gjennomfører
    canDeleteEmployeeReviews: false,
  },

  // VERNEOMBUD - Verneombud, fokus på HMS (AML § 6-2: rett til informasjon om arbeidsmiljøet)
  VERNEOMBUD: {
    canAccessDashboard: true,
    canViewAnalytics: true,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: true,    // AML § 6-2: har rett til informasjon
    canReadOwnIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: true,
    canHandleRuh: false,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: true,
    canApproveSja: false,
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
    canReadAllFormSubmissions: true,  // Verneombud ser alle innsendinger
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: false,
    canManageRoutines: false,
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
    canDeleteInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadOwnFeedback: true,
    canReadAllFeedback: false,
    canCreateFeedback: true,
    canManageFeedback: false,
    canReadEnvironment: true,
    canCreateEnvironment: true,
    canUpdateEnvironment: false,
    canRecordEnvironmentalMeasurements: true,
    canReadManagementReviews: false,
    canCreateManagementReviews: false,
    canApproveManagementReviews: false,
    canReadMeetings: true,
    canCreateMeetings: false,
    canOrganizeMeetings: false,
    canViewAllMeetings: false,
    canSubmitWhistleblowing: true,
    canViewWhistleblowing: false,
    canHandleWhistleblowing: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: false,
    canViewAllReports: false,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: false,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: true,
    canViewHmsTavle: true,
    canManageHmsTavle: false,
    canReviewSubmissions: false,
    canReadOwnEmployeeReviews: true,
    canReadAllEmployeeReviews: false,
    canCreateEmployeeReviews: false,
    canConductEmployeeReviews: false,
    canDeleteEmployeeReviews: false,
  },

  // ANSATT - Ansatt, begrenset tilgang
  ANSATT: {
    canAccessDashboard: true,
    canViewAnalytics: false,
    canReadDocuments: true,
    canCreateDocuments: false,
    canApproveDocuments: false,
    canDeleteDocuments: false,
    canReadIncidents: false,        // Kan IKKE se andres avvik
    canReadOwnIncidents: true,      // Kan se egne innsendte avvik
    canCreateIncidents: true,       // Kan rapportere avvik og kundeklager
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRuh: false,              // Kan IKKE se andres RUH-rapporter
    canReadOwnRuh: true,            // Kan se egne innsendte RUH-rapporter
    canCreateRuh: true,             // Alle ansatte kan sende RUH
    canHandleRuh: false,
    canReadSja: false,              // Kan IKKE se andres SJA-analyser
    canReadOwnSja: true,            // Kan se egne opprettede SJA
    canCreateSja: true,             // Alle ansatte kan opprette SJA
    canApproveSja: false,
    canReadRisks: false,
    canCreateRisks: false,
    canApproveRisks: false,
    canDeleteRisks: false,
    canReadActions: false,          // Kun egne
    canCreateActions: false,
    canUpdateActions: false,
    canDeleteActions: false,
    canReadForms: true,
    canFillForms: true,
    canCreateForms: false,
    canManageForms: false,
    canReadAllFormSubmissions: false, // Kan IKKE se andres skjemainnsendinger
    canReadOwnFormSubmissions: true,  // Kan se egne innsendinger
    canReadRoutines: true,
    canCreateRoutines: false,
    canManageRoutines: false,
    canReadChemicals: true,
    canCreateChemicals: false,
    canUpdateChemicals: false,
    canDeleteChemicals: false,
    canReadOwnTraining: true,
    canReadAllTraining: false,
    canCreateTraining: true, // Kan registrere egen kompetanse (krever godkjenning)
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
    canDeleteInspections: false,
    canReadGoals: false,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadOwnFeedback: true, // Kan se egen tilbakemelding
    canReadAllFeedback: false,
    canCreateFeedback: true, // Kan legge inn kundetilbakemelding/ros
    canManageFeedback: false,
    canReadEnvironment: false,
    canCreateEnvironment: false,
    canUpdateEnvironment: false,
    canRecordEnvironmentalMeasurements: false,
    canReadManagementReviews: false,
    canCreateManagementReviews: false,
    canApproveManagementReviews: false,
    canReadMeetings: false,
    canCreateMeetings: false,
    canOrganizeMeetings: false,
    canViewAllMeetings: false,
    canSubmitWhistleblowing: true, // Alle ansatte kan varsle
    canViewWhistleblowing: false,
    canHandleWhistleblowing: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: false,
    canViewAllReports: false,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: false,
    canManageExposureRegister: false,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: false,
    canViewHmsTavle: true,
    canManageHmsTavle: false,
    canReviewSubmissions: false,
    canReadOwnEmployeeReviews: true,  // Ansatt kan se egne
    canReadAllEmployeeReviews: false,
    canCreateEmployeeReviews: false,
    canConductEmployeeReviews: false,
    canDeleteEmployeeReviews: false,
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
    canReadOwnIncidents: true,
    canCreateIncidents: true,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: true,
    canHandleRuh: false,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: true,
    canApproveSja: false,
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
    canReadAllFormSubmissions: true,
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: false,
    canManageRoutines: false,
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
    canDeleteInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadOwnFeedback: true,
    canReadAllFeedback: true,
    canCreateFeedback: true,
    canManageFeedback: false,
    canReadEnvironment: true,
    canCreateEnvironment: false,
    canUpdateEnvironment: false,
    canRecordEnvironmentalMeasurements: true,
    canReadManagementReviews: true,
    canCreateManagementReviews: false,
    canApproveManagementReviews: false,
    canReadMeetings: true,
    canCreateMeetings: false,
    canOrganizeMeetings: false,
    canViewAllMeetings: true,
    canSubmitWhistleblowing: true,
    canViewWhistleblowing: false,
    canHandleWhistleblowing: false,
    canReadUsers: false,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: false,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: false,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: false,
    canViewHmsTavle: true,
    canManageHmsTavle: false,
    canReviewSubmissions: false,
    canReadOwnEmployeeReviews: false,
    canReadAllEmployeeReviews: false,
    canCreateEmployeeReviews: false,
    canConductEmployeeReviews: false,
    canDeleteEmployeeReviews: false,
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
    canReadOwnIncidents: true,
    canCreateIncidents: false,
    canInvestigateIncidents: false,
    canCloseIncidents: false,
    canReadRuh: true,
    canReadOwnRuh: true,
    canCreateRuh: false,
    canHandleRuh: false,
    canReadSja: true,
    canReadOwnSja: true,
    canCreateSja: false,
    canApproveSja: false,
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
    canReadAllFormSubmissions: true,
    canReadOwnFormSubmissions: true,
    canReadRoutines: true,
    canCreateRoutines: false,
    canManageRoutines: false,
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
    canDeleteInspections: false,
    canReadGoals: true,
    canCreateGoals: false,
    canUpdateGoals: false,
    canMeasureGoals: false,
    canReadOwnFeedback: true,
    canReadAllFeedback: true,
    canCreateFeedback: false,
    canManageFeedback: false,
    canReadEnvironment: true,
    canCreateEnvironment: false,
    canUpdateEnvironment: false,
    canRecordEnvironmentalMeasurements: false,
    canReadManagementReviews: true,
    canCreateManagementReviews: false,
    canApproveManagementReviews: false,
    canReadMeetings: true,
    canCreateMeetings: false,
    canOrganizeMeetings: false,
    canViewAllMeetings: true,
    canSubmitWhistleblowing: false,
    canViewWhistleblowing: false,
    canHandleWhistleblowing: false,
    canReadUsers: true,
    canInviteUsers: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canReadSettings: true,
    canUpdateSettings: false,
    canExportReports: true,
    canViewAllReports: true,
    canAccessTimeRegistration: true,
    canReadLegalRegister: true,
    canReadExposureRegister: true,
    canManageExposureRegister: false,
    canReadConstructionCompliance: true,
    canManageConstructionCompliance: false,
    canViewHmsTavle: true,
    canManageHmsTavle: false,
    canReviewSubmissions: false,
    canReadOwnEmployeeReviews: false,
    canReadAllEmployeeReviews: true,  // Revisor kan lese alt
    canCreateEmployeeReviews: false,
    canConductEmployeeReviews: false,
    canDeleteEmployeeReviews: false,
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
    routines: perms.canReadRoutines,
    risks: perms.canReadRisks,
    riskRegister: perms.canReadRisks,
    incidents: perms.canReadIncidents || perms.canCreateIncidents,
    hseStatistics: perms.canReadIncidents || perms.canCreateIncidents,
    ruh: perms.canReadRuh || perms.canCreateRuh,
    sja: perms.canReadSja || perms.canCreateSja,
    inspections: perms.canReadInspections,
    chemicals: perms.canReadChemicals,
    training: perms.canReadOwnTraining || perms.canReadAllTraining,
    audits: perms.canReadAudits,
    managementReviews: perms.canReadManagementReviews,
    annualHmsPlan: perms.canReadManagementReviews,
    meetings: perms.canReadMeetings,
    whistleblowing: perms.canViewWhistleblowing || perms.canSubmitWhistleblowing,
    actions: perms.canReadActions,
    goals: perms.canReadGoals,
    environment: perms.canReadEnvironment,
    feedback: perms.canReadOwnFeedback || perms.canReadAllFeedback || perms.canCreateFeedback,
    complaints: perms.canCreateIncidents,
    settings: perms.canReadSettings,
    timeRegistration: perms.canAccessTimeRegistration,
    legalRegister: perms.canReadLegalRegister,
    exposureRegister: perms.canReadExposureRegister,
    constructionCompliance: perms.canReadConstructionCompliance,
    hmsTavle: perms.canViewHmsTavle || perms.canManageHmsTavle,
    employeeReviews: perms.canReadOwnEmployeeReviews || perms.canReadAllEmployeeReviews,
    support: true, // Alle innloggede brukere kan kontakte HMS-representanter
    benchmark: true, // Alle kan se benchmark (krever opt-in for data)
    hmsHandbok: perms.canReadDocuments || perms.canReadRoutines, // Alle som kan lese dokumenter/rutiner ser håndboken
    hmsCockpit: perms.canReadDocuments, // HMS Cockpit krever lesetilgang til dokumenter
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

