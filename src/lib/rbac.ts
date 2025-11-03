import { Role } from "@prisma/client";

export const roleHierarchy: Record<Role, number> = {
  ADMIN: 100,
  HMS: 90,
  LEDER: 70,
  VERNEOMBUD: 50,
  BHT: 40,
  ANSATT: 20,
  REVISOR: 10,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  HMS: "HMS-koordinator",
  LEDER: "Leder",
  VERNEOMBUD: "Verneombud",
  ANSATT: "Ansatt",
  BHT: "Bedriftshelsetjeneste",
  REVISOR: "Revisor",
};

