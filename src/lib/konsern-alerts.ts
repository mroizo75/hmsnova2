import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

interface KonsernNotificationSettings {
  scoreThreshold: number;
  incidentAlertDays: number;
  emailRecipients: string[];
}

interface AlertItem {
  tenantName: string;
  type: "score" | "incidents" | "routines" | "risk";
  severity: "critical" | "warning";
  message: string;
  value?: number;
}

interface GroupAlertResult {
  groupId: string;
  groupName: string;
  alertCount: number;
  emailsSent: number;
}

function parseNotificationSettings(settings: unknown): KonsernNotificationSettings | null {
  const raw = settings as Record<string, unknown> | null;
  if (!raw?.notifications) return null;

  const notif = raw.notifications as Record<string, unknown>;
  const recipients = notif.emailRecipients as string[] | undefined;

  if (!recipients?.length) return null;

  return {
    scoreThreshold: (notif.scoreThreshold as number) ?? 60,
    incidentAlertDays: (notif.incidentAlertDays as number) ?? 30,
    emailRecipients: recipients,
  };
}

async function computeTenantScores(tenantIds: string[]): Promise<Map<string, number>> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [routines, risks, docs, inspections, training, employees] = await Promise.all([
    prisma.routine.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.riskAssessment.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, updatedAt: { gte: twelveMonthsAgo } },
      _count: true,
    }),
    prisma.document.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.inspection.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds }, scheduledDate: { gte: twelveMonthsAgo } },
      _count: true,
    }),
    prisma.training.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      _count: true,
    }),
    prisma.userTenant.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
  ]);

  const scores = new Map<string, number>();

  for (const tid of tenantIds) {
    const tenantRoutines = routines.filter((r) => r.tenantId === tid);
    const totalRoutines = tenantRoutines.reduce((s, r) => s + r._count, 0);
    const activeRoutines = tenantRoutines.find((r) => r.status === "ACTIVE")?._count ?? 0;
    const routineScore = totalRoutines > 0 ? Math.round((activeRoutines / totalRoutines) * 100) : 0;

    const riskCount = risks.find((r) => r.tenantId === tid)?._count ?? 0;
    const riskScore = Math.min(100, riskCount * 20);

    const tenantDocs = docs.filter((d) => d.tenantId === tid);
    const totalDocs = tenantDocs.reduce((s, d) => s + d._count, 0);
    const approvedDocs = tenantDocs.find((d) => d.status === "APPROVED")?._count ?? 0;
    const documentScore = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

    const tenantInsp = inspections.filter((i) => i.tenantId === tid);
    const totalInsp = tenantInsp.reduce((s, i) => s + i._count, 0);
    const completedInsp = tenantInsp.find((i) => i.status === "COMPLETED")?._count ?? 0;
    const inspectionScore = totalInsp > 0 ? Math.round((completedInsp / totalInsp) * 100) : 0;

    const empCount = employees.find((e) => e.tenantId === tid)?._count ?? 1;
    const validTraining = training.find((t) => t.tenantId === tid)?._count ?? 0;
    const trainingScore = Math.min(100, Math.round((validTraining / empCount) * 100));

    const overall = Math.round(
      routineScore * 0.25 + riskScore * 0.2 + documentScore * 0.2 +
      inspectionScore * 0.2 + trainingScore * 0.15
    );
    scores.set(tid, overall);
  }

  return scores;
}

function buildAlertEmail(groupName: string, alerts: AlertItem[]): string {
  const criticals = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  const renderAlerts = (items: AlertItem[], color: string, label: string) => {
    if (items.length === 0) return "";
    return `
      <h3 style="color:${color};margin:16px 0 8px">${label} (${items.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6;text-align:left">
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Bedrift</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Type</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Beskrivelse</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((a) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6"><strong>${a.tenantName}</strong></td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${typeLabels[a.type]}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${a.message}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1f2937">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="font-size:20px;margin:0">${groupName} — HMS-varsler</h1>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0">
          Daglig oppsummering · ${new Date().toLocaleDateString("nb-NO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <strong style="color:#dc2626">${criticals.length} kritiske</strong>
        <span style="color:#6b7280;margin:0 8px">·</span>
        <strong style="color:#d97706">${warnings.length} advarsler</strong>
      </div>

      ${renderAlerts(criticals, "#dc2626", "Kritiske varsler")}
      ${renderAlerts(warnings, "#d97706", "Advarsler")}

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="font-size:12px;color:#9ca3af;text-align:center">
        Denne e-posten ble sendt fra HMS Nova konsernvarsler.<br/>
        Du kan endre varslingsinnstillinger under Konsern → Innstillinger.
      </p>
    </body>
    </html>
  `;
}

const typeLabels: Record<string, string> = {
  score: "HMS-score",
  incidents: "Hendelser",
  routines: "Rutiner",
  risk: "Risikovurdering",
};

export async function runKonsernAlerts(): Promise<GroupAlertResult[]> {
  const groups = await prisma.corporateGroup.findMany({
    select: {
      id: true,
      name: true,
      settings: true,
      tenants: {
        where: { status: "ACTIVE" },
        include: { tenant: { select: { id: true, name: true } } },
      },
    },
  });

  const results: GroupAlertResult[] = [];

  for (const group of groups) {
    const config = parseNotificationSettings(group.settings);
    if (!config) {
      results.push({ groupId: group.id, groupName: group.name, alertCount: 0, emailsSent: 0 });
      continue;
    }

    const tenantIds = group.tenants.map((t) => t.tenant.id);
    if (tenantIds.length === 0) continue;

    const tenantNames = new Map(group.tenants.map((t) => [t.tenant.id, t.tenant.name]));
    const alerts: AlertItem[] = [];

    // 1. Score-sjekk
    const scores = await computeTenantScores(tenantIds);
    for (const [tid, score] of scores) {
      if (score < config.scoreThreshold) {
        alerts.push({
          tenantName: tenantNames.get(tid) ?? "Ukjent",
          type: "score",
          severity: score < config.scoreThreshold * 0.5 ? "critical" : "warning",
          message: `HMS-score ${score}% (terskel: ${config.scoreThreshold}%)`,
          value: score,
        });
      }
    }

    // 2. Gamle ubehandlede hendelser
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.incidentAlertDays);

    const oldIncidents = await prisma.incident.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: { in: ["OPEN", "INVESTIGATING"] },
        occurredAt: { lte: cutoffDate },
      },
      _count: true,
    });

    for (const item of oldIncidents) {
      alerts.push({
        tenantName: tenantNames.get(item.tenantId) ?? "Ukjent",
        type: "incidents",
        severity: item._count >= 5 ? "critical" : "warning",
        message: `${item._count} ubehandlede hendelser eldre enn ${config.incidentAlertDays} dager`,
        value: item._count,
      });
    }

    // 3. Rutiner som trenger gjennomgang
    const overdueRoutines = await prisma.routine.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: "NEEDS_REVIEW",
      },
      _count: true,
    });

    for (const item of overdueRoutines) {
      if (item._count > 0) {
        alerts.push({
          tenantName: tenantNames.get(item.tenantId) ?? "Ukjent",
          type: "routines",
          severity: item._count >= 10 ? "critical" : "warning",
          message: `${item._count} rutiner trenger gjennomgang`,
          value: item._count,
        });
      }
    }

    // 4. Utdaterte risikovurderinger (>12 mnd)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldRisks = await prisma.riskAssessment.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        updatedAt: { lt: oneYearAgo },
      },
      _count: true,
    });

    for (const item of oldRisks) {
      if (item._count > 0) {
        alerts.push({
          tenantName: tenantNames.get(item.tenantId) ?? "Ukjent",
          type: "risk",
          severity: "warning",
          message: `${item._count} risikovurderinger ikke oppdatert siste 12 mnd`,
          value: item._count,
        });
      }
    }

    // Send e-post hvis varsler finnes
    let emailsSent = 0;
    if (alerts.length > 0) {
      const html = buildAlertEmail(group.name, alerts);
      const subject = `HMS-varsler: ${alerts.filter((a) => a.severity === "critical").length} kritiske, ${alerts.filter((a) => a.severity === "warning").length} advarsler — ${group.name}`;

      for (const recipient of config.emailRecipients) {
        try {
          await sendEmail({ to: recipient, subject, html });
          emailsSent++;
        } catch (err) {
          console.error(`Kunne ikke sende konsern-varsel til ${recipient}:`, err);
        }
      }

      // Logg varsling i audit-log
      await prisma.corporateGroupAuditLog.create({
        data: {
          groupId: group.id,
          userId: "system",
          action: "SEND_ALERT_EMAIL",
          targetType: "notification",
          details: JSON.parse(JSON.stringify({
            alertCount: alerts.length,
            criticalCount: alerts.filter((a) => a.severity === "critical").length,
            recipients: config.emailRecipients,
            emailsSent,
          })),
        },
      });
    }

    results.push({
      groupId: group.id,
      groupName: group.name,
      alertCount: alerts.length,
      emailsSent,
    });
  }

  return results;
}
