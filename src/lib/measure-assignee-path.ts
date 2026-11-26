/** Ansatt uten dashboard skal åpne tiltaket i ansattportalen, ikke bli sendt til hjem. */
export function employeeMeasureRedirect(
  pathname: string,
  role: string | null | undefined,
  extraRoles: readonly string[],
): string | null {
  const staysOnDashboard =
    role !== "ANSATT" ||
    extraRoles.includes("LEDER") ||
    extraRoles.includes("VERNEOMBUD");
  if (staysOnDashboard) return null;
  if (pathname === "/dashboard/actions") return "/ansatt/tiltak";
  const match = pathname.match(/^\/dashboard\/measures\/([^/]+)$/);
  if (match?.[1]) return `/ansatt/tiltak/${match[1]}`;
  return null;
}

export function assigneeMeasurePath(measureId: string): string {
  return `/ansatt/tiltak/${measureId}`;
}
