"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchIncidentStatistics() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const yearData = await Promise.all(
    years.map(async (year) => {
      const from = new Date(`${year}-01-01T00:00:00.000Z`);
      const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

      const [incidents, timeEntries] = await Promise.all([
        prisma.incident.findMany({
          where: {
            tenantId,
            occurredAt: { gte: from, lt: to },
            type: { in: ["ULYKKE", "NESTEN", "YRKESSYKDOM"] },
          },
          select: {
            isFatal: true,
            isLostTimeIncident: true,
            lostWorkdays: true,
            isRestrictedWork: true,
            medicalAttentionRequired: true,
          },
        }),
        prisma.timeEntry.findMany({
          where: { tenantId, date: { gte: from, lt: to } },
          select: { hours: true },
        }),
      ]);

      const manHours = timeEntries.reduce((s, e) => s + e.hours, 0);
      const fatalities = incidents.filter((i) => i.isFatal).length;
      const lti = incidents.filter((i) => i.isLostTimeIncident).length;
      const lostWorkdays = incidents.reduce((s, i) => s + (i.lostWorkdays ?? 0), 0);
      const restricted = incidents.filter((i) => i.isRestrictedWork).length;
      const medical = incidents.filter((i) => i.medicalAttentionRequired).length;
      const totalRecordable = fatalities + lti + restricted + medical;
      const trir =
        manHours > 0
          ? Math.round(((totalRecordable * 200000) / manHours) * 100) / 100
          : null;

      return {
        year,
        manHours: Math.round(manHours * 10) / 10,
        fatalities,
        lostTimeIncidents: lti,
        lostWorkdays,
        restrictedWorkCases: restricted,
        medicalTreatmentCases: medical,
        totalRecordable,
        trir,
      };
    }),
  );

  return JSON.parse(JSON.stringify(yearData));
}
