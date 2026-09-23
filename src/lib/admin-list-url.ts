export const ADMIN_TENANTS_LIST_STORAGE_KEY = "hmsnova:admin-tenants-list";

export function parsePageParam(page: string | string[] | undefined): number {
  const raw = Array.isArray(page) ? page[0] : page;
  const parsed = parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildAdminListUrl(
  basePath: string,
  page: number,
  search?: string,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function tenantDetailHref(
  tenantId: string,
  page: number,
  search?: string,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("returnPage", String(page));
  if (search) params.set("returnSearch", search);
  const qs = params.toString();
  return qs ? `/admin/tenants/${tenantId}?${qs}` : `/admin/tenants/${tenantId}`;
}

export function tenantsListHrefFromReturn(
  returnPage?: string,
  returnSearch?: string,
): string {
  return buildAdminListUrl(
    "/admin/tenants",
    parsePageParam(returnPage),
    returnSearch?.trim() || undefined,
  );
}
