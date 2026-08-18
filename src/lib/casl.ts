import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability";
import { Role } from "@prisma/client";
import { rolePermissions } from "@/lib/permissions";

export type Actions = "manage" | "create" | "read" | "update" | "delete";
export type Subjects =
  | "all"
  | "Document"
  | "Risk"
  | "Incident"
  | "Training"
  | "Measure"
  | "Audit"
  | "Goal"
  | "Chemical"
  | "EnvironmentalAspect"
  | "EnvironmentalMeasurement"
  | "FormTemplate"
  | "FormSubmission"
  | "CustomerFeedback";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface SessionUser {
  id: string;
  tenantId?: string | null;
  role?: Role;
  department?: string | null;
  isSuperAdmin?: boolean;
  isSupport?: boolean;
}

export function defineAbilities(user: SessionUser): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.isSuperAdmin) {
    can("manage", "all");
    return build();
  }

  if (user.isSupport) {
    can(["read", "create", "update"], "all");
    return build();
  }

  if (!user.tenantId || !user.role) {
    return build();
  }

  const perms = rolePermissions[user.role];

  if (!perms) {
    return build();
  }

  if (user.role === "ADMIN" || user.role === "HMS") {
    can("manage", "all");
  } else {
    applyDomainPermissions(perms, can);
  }

  cannot("delete", "Document");

  return build();
}

function applyDomainPermissions(perms: typeof rolePermissions[Role], can: AbilityBuilder<AppAbility>["can"]) {
  if (perms.canReadDocuments) can("read", "Document");
  if (perms.canCreateDocuments) can("create", "Document");
  if (perms.canApproveDocuments) can("update", "Document");
  if (perms.canDeleteDocuments) can("delete", "Document");

  if (perms.canReadRisks) can("read", "Risk");
  if (perms.canCreateRisks) can("create", "Risk");
  if (perms.canApproveRisks || perms.canDeleteRisks) {
    can("update", "Risk");
    if (perms.canDeleteRisks) can("delete", "Risk");
  }

  if (perms.canReadIncidents) can("read", "Incident");
  if (perms.canCreateIncidents) can("create", "Incident");
  if (perms.canInvestigateIncidents || perms.canCloseIncidents) {
    can("update", "Incident");
    if (perms.canCloseIncidents) can("delete", "Incident");
  }

  if (perms.canReadActions) {
    can("read", "Measure");
  }
  if (perms.canCreateActions) can("create", "Measure");
  if (perms.canUpdateActions) can("update", "Measure");
  if (perms.canDeleteActions) can("delete", "Measure");

  if (perms.canReadAudits) can("read", "Audit");
  if (perms.canCreateAudits) can("create", "Audit");
  if (perms.canConductAudits || perms.canCloseAudits) {
    can("update", "Audit");
    if (perms.canCloseAudits) can("delete", "Audit");
  }

  if (perms.canReadChemicals) can("read", "Chemical");
  if (perms.canCreateChemicals) can("create", "Chemical");
  if (perms.canUpdateChemicals) can("update", "Chemical");
  if (perms.canDeleteChemicals) can("delete", "Chemical");

  const canReadTraining = perms.canReadOwnTraining || perms.canReadAllTraining;
  if (canReadTraining) can("read", "Training");
  if (perms.canCreateTraining) can("create", "Training");
  if (perms.canAssignTraining || perms.canEvaluateTraining) {
    can("update", "Training");
  }

  if (perms.canReadGoals) can("read", "Goal");
  if (perms.canCreateGoals || perms.canUpdateGoals || perms.canMeasureGoals) {
    can("update", "Goal");
    if (perms.canCreateGoals) can("create", "Goal");
  }

  const canReadFeedback = perms.canReadDocuments || perms.canReadGoals || perms.canReadAudits;
  if (canReadFeedback) {
    can("read", "CustomerFeedback");
  }
  if (perms.canCreateDocuments || perms.canCreateGoals || perms.canManageForms) {
    can("create", "CustomerFeedback");
  }
  if (perms.canUpdateGoals || perms.canManageForms || perms.canUpdateActions) {
    can("update", "CustomerFeedback");
  }

  if (perms.canReadForms) can("read", "FormTemplate");
  if (perms.canFillForms) {
    can("create", "FormSubmission");
    can("read", "FormSubmission");
  }

  if (perms.canReadEnvironment) can("read", "EnvironmentalAspect");
  if (perms.canCreateEnvironment) can("create", "EnvironmentalAspect");
  if (perms.canUpdateEnvironment) can("update", "EnvironmentalAspect");
  if (perms.canRecordEnvironmentalMeasurements) {
    can(["create", "update"], "EnvironmentalMeasurement");
  }

}

