"use server";

import { getTenantContextSafe } from "@/lib/tenant-context";
import {
  getProjects,
  getTimeRegistrationOverview,
  getTimeRegistrationConfig,
} from "@/server/actions/time-registration.actions";

export async function fetchTimeRegistrationData() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { config: null, projects: [], enabled: false, overviewData: null, tenantId: "" };
  const { tenantId } = ctx;

  const [configRes, projectsRes] = await Promise.all([
    getTimeRegistrationConfig(tenantId),
    getProjects(tenantId, false),
  ]);

  const config = configRes.success ? configRes.data : null;
  const projects = projectsRes.success ? projectsRes.data : [];
  const enabled = config?.timeRegistrationEnabled ?? false;

  let overviewData = null;
  if (enabled) {
    const overviewRes = await getTimeRegistrationOverview(tenantId, {
      period: "month",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    });
    overviewData = overviewRes.success ? overviewRes.data : null;
  }

  return JSON.parse(JSON.stringify({
    config,
    projects,
    enabled,
    overviewData,
    tenantId,
  }));
}
