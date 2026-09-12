export type HrWorkspaceHref =
  | "/dashboard/hr"
  | "/dashboard/personalarkiv"
  | "/dashboard/fravaer"
  | "/dashboard/onboarding"
  | "/dashboard/medarbeidersamtale"
  | "/dashboard/avdelinger";

export type HrWorkspaceItem = {
  href: HrWorkspaceHref;
  label: string;
  permission: "hr" | "personnelArchive" | "absence" | "boarding" | "employeeReviews" | "departments";
};

/** Fast HR-løp: oversikt → ansattmappe → fravær/sykdom → onboarding → samtale → avdeling */
export const HR_WORKSPACE_ITEMS: HrWorkspaceItem[] = [
  { href: "/dashboard/hr", label: "Oversikt", permission: "hr" },
  { href: "/dashboard/personalarkiv", label: "Ansatte", permission: "personnelArchive" },
  { href: "/dashboard/fravaer", label: "Fravær og sykdom", permission: "absence" },
  { href: "/dashboard/onboarding", label: "Onboarding", permission: "boarding" },
  { href: "/dashboard/medarbeidersamtale", label: "Samtaler", permission: "employeeReviews" },
  { href: "/dashboard/avdelinger", label: "Avdelinger", permission: "departments" },
];

export function isHrWorkspacePath(pathname: string, href: HrWorkspaceHref): boolean {
  if (href === "/dashboard/hr") return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}
