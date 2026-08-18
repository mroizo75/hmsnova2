import type { NotificationType, UserTenant } from "@prisma/client";

export type NotificationPreferenceKey =
  | "notifyIncidents"
  | "notifyMeasures"
  | "notifyAudits"
  | "notifyMeetings"
  | "notifyInspections"
  | "notifyRisks"
  | "notifyDocuments"
  | "notifyTraining";

const notificationTypePreferenceMap: Partial<Record<NotificationType, NotificationPreferenceKey>> = {
  NEW_INCIDENT: "notifyIncidents",
  INCIDENT_UPDATED: "notifyIncidents",
  INCIDENT_CLOSED: "notifyIncidents",
  INCIDENT_OVERDUE: "notifyIncidents",
  MEASURE_ASSIGNED: "notifyMeasures",
  MEASURE_DUE_SOON: "notifyMeasures",
  MEASURE_OVERDUE: "notifyMeasures",
  MEASURE_REMINDER: "notifyMeasures",
  AUDIT_SCHEDULED: "notifyAudits",
  AUDIT_REMINDER: "notifyAudits",
  AUDIT_FINDING_OPEN: "notifyAudits",
  MEETING_REMINDER: "notifyMeetings",
  MEETING_SCHEDULED: "notifyMeetings",
  INSPECTION_REMINDER: "notifyInspections",
  INSPECTION_SCHEDULED: "notifyInspections",
  INSPECTION_OVERDUE: "notifyInspections",
  INSPECTION_FINDING: "notifyInspections",
  RISK_REVIEW_DUE: "notifyRisks",
  RISK_HIGH_SCORE: "notifyRisks",
  RISK_CONTROL_DUE: "notifyRisks",
  DOCUMENT_REVIEW_DUE: "notifyDocuments",
  DOCUMENT_EXPIRED: "notifyDocuments",
  DOCUMENT_APPROVED: "notifyDocuments",
  ROUTINE_ASSIGNED: "notifyDocuments",
  ROUTINE_REVIEW_DUE: "notifyDocuments",
  TRAINING_DUE: "notifyTraining",
  TRAINING_EXPIRED: "notifyTraining",
  TRAINING_ASSIGNED: "notifyTraining",
  CHEMICAL_SDS_REVIEW: "notifyRisks",
  CHEMICAL_EXPIRED: "notifyRisks",
  // HMS Intelligens-motor
  IMPROVEMENT_SUGGESTION: "notifyIncidents",
  IMPROVEMENT_REMINDER: "notifyIncidents",
  HMS_SCORE_DROP: "notifyIncidents",
  HMS_SCORE_MILESTONE: "notifyIncidents",
  ROUTINE_COMPLIANCE_ALERT: "notifyDocuments",
  LAW_CHANGE_ALERT: "notifyDocuments",
};

const immediateEmailTypes = new Set<NotificationType>([
  "NEW_INCIDENT",
  "INCIDENT_OVERDUE",
  "MEASURE_OVERDUE",
  "WHISTLEBLOWING",
  "WHISTLEBLOWING_MSG",
  "TRAINING_EXPIRED",
  "SYSTEM_ALERT",
  "INSPECTION_FINDING",
  "GUEST_SUBMISSION",
  "SUPPORT_TICKET",
  "SUPPORT_MSG",
]);

export function isNotificationTypeEnabledForUser(
  type: NotificationType,
  userTenant: Pick<UserTenant, NotificationPreferenceKey>
): boolean {
  const preferenceKey = notificationTypePreferenceMap[type];
  if (!preferenceKey) {
    return true;
  }

  return userTenant[preferenceKey];
}

export function shouldSendImmediateEmailForType(
  type: NotificationType,
  userTenant: Pick<UserTenant, "notifyByEmail" | NotificationPreferenceKey>
): boolean {
  if (!userTenant.notifyByEmail) {
    return false;
  }

  if (!immediateEmailTypes.has(type)) {
    return false;
  }

  return isNotificationTypeEnabledForUser(type, userTenant);
}

// SMS sendes kun for kritiske hendelser som krever umiddelbar oppmerksomhet
const immediateSmsTypes = new Set<NotificationType>([
  "NEW_INCIDENT",
  "INCIDENT_OVERDUE",
  "MEASURE_OVERDUE",
  "WHISTLEBLOWING",
  "TRAINING_EXPIRED",
  "INSPECTION_FINDING",
]);

export function shouldSendImmediateSmsForType(
  type: NotificationType,
  userTenant: Pick<UserTenant, "notifyBySms" | NotificationPreferenceKey>
): boolean {
  if (!userTenant.notifyBySms) {
    return false;
  }

  if (!immediateSmsTypes.has(type)) {
    return false;
  }

  return isNotificationTypeEnabledForUser(type, userTenant);
}
