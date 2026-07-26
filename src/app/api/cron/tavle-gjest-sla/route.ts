import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";
import {
  GUEST_RETENTION_MONTHS,
  parseGuestAttachments,
  type GuestPriority,
  type GuestType,
} from "@/features/hms-tavle/lib/gjesteservice-config";
import { notifyGuestSlaBreach } from "@/features/hms-tavle/lib/gjesteservice-notify";
import { calculateRetentionCutoff } from "@/features/hms-tavle/lib/oversiktsliste-config";

/**
 * Cron-jobb for HMS-tavlen. Kjøres hver time.
 *
 * 1. Eskalerer ubehandlede gjestmeldinger som har passert serviceløftet (SLA)
 *    til ledelsen – IK-HMS § 5 krever at avvik faktisk følges opp.
 * 2. Sletter gjestmeldinger eldre enn lagringstiden, inkludert vedlegg
 *    – GDPR art. 5(1)(e) om lagringsbegrensning.
 * 3. Sletter oversiktslister seks måneder etter at arbeidet er avsluttet
 *    – Byggherreforskriften § 15 fjerde ledd, jf. GDPR art. 5(1)(e).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sletter oversiktslister der oppbevaringsfristen er ute.
 *
 * Byggherreforskriften § 15 krever at listen oppbevares i seks måneder etter at
 * arbeidet er avsluttet – ikke kortere, og ikke uten sluttdato. Sluttdato hentes
 * fra tavlen eller det koblede prosjektet. Mangler den, regnes arbeidet som
 * avsluttet ved siste innsjekk.
 */
async function slettUtgaatteOversiktslister(
  now: Date,
  results: { deletedCheckins: number; checkinListsCleared: number }
): Promise<void> {
  const grupper = await prisma.tavleCheckin.groupBy({
    by: ["tavleId"],
    _max: { checkedInAt: true },
  });
  if (grupper.length === 0) return;

  const tavler = await prisma.hmsTavle.findMany({
    where: { id: { in: grupper.map((gruppe) => gruppe.tavleId) } },
    select: {
      id: true,
      workEndedAt: true,
      project: { select: { endDate: true } },
    },
  });
  const tavleById = new Map(tavler.map((tavle) => [tavle.id, tavle]));

  for (const gruppe of grupper) {
    const tavle = tavleById.get(gruppe.tavleId);
    if (!tavle) continue;

    const { cutoff } = calculateRetentionCutoff(
      tavle.workEndedAt ?? tavle.project?.endDate ?? null,
      gruppe._max.checkedInAt,
      now
    );
    if (!cutoff || cutoff > now) continue;

    const deleted = await prisma.tavleCheckin.deleteMany({
      where: { tavleId: gruppe.tavleId },
    });
    results.deletedCheckins += deleted.count;
    results.checkinListsCleared++;
  }
}

export async function GET(request: NextRequest) {
  const unauthorizedResponse = validateCronRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const now = new Date();
  const results = {
    escalated: 0,
    skippedByPlan: 0,
    deletedSubmissions: 0,
    deletedAttachments: 0,
    deletedCheckins: 0,
    checkinListsCleared: 0,
  };

  try {
    const overdue = await prisma.tavleGuestSubmission.findMany({
      where: {
        status: "NY",
        escalatedAt: null,
        slaDueAt: { lt: now },
      },
      select: {
        id: true,
        type: true,
        priority: true,
        slaDueAt: true,
        tavle: { select: { id: true, name: true, tenantId: true } },
      },
      take: 200,
    });

    for (const submission of overdue) {
      const subscription = await prisma.hmsTavleSubscription.findUnique({
        where: { tenantId: submission.tavle.tenantId },
        select: { plan: true, status: true },
      });

      if (
        !subscription ||
        subscription.status === "EXPIRED" ||
        !getPlanLimits(subscription.plan).hasGuestSlaEscalation
      ) {
        results.skippedByPlan++;
        continue;
      }

      await notifyGuestSlaBreach({
        tenantId: submission.tavle.tenantId,
        tavleId: submission.tavle.id,
        tavleName: submission.tavle.name,
        type: submission.type as GuestType,
        priority: submission.priority as GuestPriority,
        slaDueAt: submission.slaDueAt ?? now,
      });

      await prisma.tavleGuestSubmission.update({
        where: { id: submission.id },
        data: { escalatedAt: now },
      });
      results.escalated++;
    }

    const retentionCutoff = new Date(now);
    retentionCutoff.setMonth(retentionCutoff.getMonth() - GUEST_RETENTION_MONTHS);

    const expired = await prisma.tavleGuestSubmission.findMany({
      where: { createdAt: { lt: retentionCutoff } },
      select: { id: true, attachments: true },
      take: 500,
    });

    if (expired.length > 0) {
      const storage = getStorage();

      for (const submission of expired) {
        for (const attachment of parseGuestAttachments(submission.attachments)) {
          try {
            await storage.delete(attachment.key);
            results.deletedAttachments++;
          } catch (error) {
            console.error("[tavle-gjest-sla] Kunne ikke slette vedlegg:", attachment.key, error);
          }
        }
      }

      const deleted = await prisma.tavleGuestSubmission.deleteMany({
        where: { id: { in: expired.map((submission) => submission.id) } },
      });
      results.deletedSubmissions = deleted.count;
    }

    await slettUtgaatteOversiktslister(now, results);

    return NextResponse.json({ success: true, timestamp: now.toISOString(), results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ success: false, error: message, results }, { status: 500 });
  }
}
