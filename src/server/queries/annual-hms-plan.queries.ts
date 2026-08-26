"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAnnualPlanChecklist, serializeAnnualPlanData } from "@/server/actions/annual-hms-plan.actions";

export async function fetchAnnualHmsPlan() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const year = new Date().getFullYear();
  const result = await getAnnualPlanChecklist(session.user.tenantId, year);

  if (!result.success) return null;

  const serialized = await serializeAnnualPlanData(result.data);

  return JSON.parse(JSON.stringify(serialized));
}

export async function fetchAnnualHmsPlanReport(year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const result = await getAnnualPlanChecklist(session.user.tenantId, year);

  if (!result.success) return null;

  return JSON.parse(JSON.stringify({
    steps: result.data.steps,
    completedCount: result.data.completedCount,
    totalCount: result.data.totalCount,
    tenantName: session.user.tenantName ?? "",
  }));
}
