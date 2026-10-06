/** Nærmeste leder ser seg selv og ansatte med managerId = lederen. */
export function managedEmployeeFilter(managerUserId: string) {
  return {
    OR: [{ managerId: managerUserId }, { userId: managerUserId }],
  };
}

export function isLeaderScopedRole(role: string): boolean {
  return role === "LEDER";
}
