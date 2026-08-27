"use server";

import { getTenantContextSafe } from "@/lib/tenant-context";
import { prisma } from "@/lib/db";
import {
  getProjects,
  getTimeRegistrationOverview,
  getTimeRegistrationConfig,
} from "@/server/actions/time-registration.actions";

async function ensureDefaultProject(tenantId: string): Promise<void> {
  const existing = await prisma.project.findFirst({
    where: { tenantId, status: "ACTIVE" },
  });
  if (!existing) {
    const adminUser = await prisma.userTenant.findFirst({ where: { tenantId, role: "ADMIN" } });
    if (!adminUser) return;
    await prisma.project.create({
      data: {
        tenantId,
        name: "Generelt",
        code: "GEN",
        description: "Standard prosjekt for timeregistrering",
        createdById: adminUser.userId,
      },
    });
  }
}

export async function fetchTimeRegistrationData() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { config: null, projects: [], enabled: false, overviewData: null, tenantId: "" };
  const { tenantId } = ctx;

  const [configRes, projectsRes] = await Promise.all([
    getTimeRegistrationConfig(tenantId),
    getProjects(tenantId, false),
  ]);

  const config = configRes.success ? configRes.data : null;
  let projects = projectsRes.success ? projectsRes.data : [];
  const enabled = config?.timeRegistrationEnabled ?? false;

  if (enabled && projects.filter((p) => p.status === "ACTIVE").length === 0) {
    await ensureDefaultProject(tenantId);
    const refreshed = await getProjects(tenantId, false);
    projects = refreshed.success ? refreshed.data : projects;
  }

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
