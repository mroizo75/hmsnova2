/** Suspendert og avsluttet bedrift skal ikke kunne bruke systemet. */
export function tenantStatusBlocksAccess(status: string | null | undefined): boolean {
  return status === "SUSPENDED" || status === "CANCELLED";
}
