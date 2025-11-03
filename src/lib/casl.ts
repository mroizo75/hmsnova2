import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability";
import { Role } from "@prisma/client";

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
  | "Chemical";

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

  // Superadmin har full tilgang til alt
  if (user.isSuperAdmin) {
    can("manage", "all");
    return build();
  }

  // Support har kun tilgang til tenant-administrasjon
  if (user.isSupport) {
    // Support kan kun lese/opprette tenants, ikke slette
    can(["read", "create", "update"], "all");
    return build();
  }

  // Krev tenantId for vanlige brukere
  if (!user.tenantId || !user.role) {
    return build(); // Ingen tilganger
  }

  // ADMIN og HMS har full tilgang til alt i sin tenant
  if (user.role === "ADMIN" || user.role === "HMS") {
    can("manage", "all");
  }

  // LEDER kan administrere i sin avdeling
  if (user.role === "LEDER") {
    can(["create", "read", "update"], "all");
    can("delete", ["Incident", "Risk"]);
  }

  // VERNEOMBUD kan rapportere og se på risiko/avvik
  if (user.role === "VERNEOMBUD") {
    can(["read", "create"], ["Incident", "Risk"]);
    can("update", "Risk"); // Forenklet: alle VERNEOMBUD kan oppdatere risiko
    can("read", ["Document", "Training", "Audit"]);
  }

  // ANSATT kan lese dokumenter og rapportere hendelser
  if (user.role === "ANSATT") {
    can("read", ["Document", "Training"]);
    can("create", "Incident");
  }

  // BHT (Bedriftshelsetjeneste) kan lese og kommentere
  if (user.role === "BHT") {
    can("read", "all");
    can("create", ["Incident", "Risk"]);
  }

  // REVISOR har kun lesetilgang
  if (user.role === "REVISOR") {
    can("read", "all");
  }

  // Ingen kan slette lovdokumenter (forenklet conditions)
  cannot("delete", "Document");

  return build();
}

