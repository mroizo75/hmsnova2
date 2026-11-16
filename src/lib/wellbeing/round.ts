/** Admin, HR og HMS-ansvarlig kan sette i gang kartlegging. Øvrige roller svarer bare når de er mottakere. */
export function canStartWellbeingRound(role: string): boolean {
  return role === "ADMIN" || role === "HMS" || role === "HR";
}
