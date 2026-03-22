import test from "node:test";
import assert from "node:assert/strict";
import type { NotificationType } from "@prisma/client";
import {
  isNotificationTypeEnabledForUser,
  shouldSendImmediateEmailForType,
} from "../src/lib/notification-routing";

test("isNotificationTypeEnabledForUser bruker kategori-toggle", () => {
  const userTenant = {
    notifyIncidents: false,
    notifyMeasures: true,
    notifyAudits: true,
    notifyMeetings: true,
    notifyInspections: true,
    notifyRisks: true,
    notifyDocuments: true,
    notifyTraining: true,
  };

  const incidentEnabled = isNotificationTypeEnabledForUser("NEW_INCIDENT", userTenant);
  const measureEnabled = isNotificationTypeEnabledForUser("MEASURE_ASSIGNED", userTenant);

  assert.equal(incidentEnabled, false);
  assert.equal(measureEnabled, true);
});

test("shouldSendImmediateEmailForType krever e-post aktivert og viktig type", () => {
  const userTenant = {
    notifyByEmail: true,
    notifyIncidents: true,
    notifyMeasures: true,
    notifyAudits: true,
    notifyMeetings: true,
    notifyInspections: true,
    notifyRisks: true,
    notifyDocuments: true,
    notifyTraining: true,
  };

  const immediateType: NotificationType = "NEW_INCIDENT";
  const nonImmediateType: NotificationType = "MEETING_SCHEDULED";

  assert.equal(shouldSendImmediateEmailForType(immediateType, userTenant), true);
  assert.equal(shouldSendImmediateEmailForType(nonImmediateType, userTenant), false);
});

test("rutinevarsler bruker dokumentpreferanse", () => {
  const userTenant = {
    notifyIncidents: true,
    notifyMeasures: true,
    notifyAudits: true,
    notifyMeetings: true,
    notifyInspections: true,
    notifyRisks: true,
    notifyDocuments: false,
    notifyTraining: true,
  };

  assert.equal(isNotificationTypeEnabledForUser("ROUTINE_ASSIGNED", userTenant), false);
  assert.equal(isNotificationTypeEnabledForUser("ROUTINE_REVIEW_DUE", userTenant), false);
});
