const KONSERN_ELIGIBLE_HMS_ROLES = new Set(["ADMIN", "HMS"]);

export function canEnterKonsernFromHms(
  tenantRole: string | null | undefined
): boolean {
  return Boolean(tenantRole && KONSERN_ELIGIBLE_HMS_ROLES.has(tenantRole));
}

export function hasKonsernMenuInHms(input: {
  corporateGroupId?: string | null;
  tenantRole?: string | null;
}): boolean {
  return Boolean(input.corporateGroupId) && canEnterKonsernFromHms(input.tenantRole);
}

export function canAccessKonsernPortal(input: {
  hasCorporateGroup: boolean;
  isSuperAdmin?: boolean;
  isSupport?: boolean;
  tenantId?: string | null;
  tenantRole?: string | null;
}): boolean {
  if (input.isSuperAdmin === true || input.isSupport === true) {
    return true;
  }

  if (!input.hasCorporateGroup) {
    return false;
  }

  if (!input.tenantId) {
    return true;
  }

  return canEnterKonsernFromHms(input.tenantRole);
}
