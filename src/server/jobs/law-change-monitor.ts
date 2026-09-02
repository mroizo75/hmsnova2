/**
 * Ukentlig skanning av Norsk Lovtidend og Arbeidstilsynet (hver mandag).
 *
 * Hjemmel: IK-HMS § 5 nr. 1 og nr. 2, ISO 45001:2018 6.1.3.
 */

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  extractArbeidstilsynetAnnouncements,
  extractLovtidendAnnouncements,
  matchAnnouncement,
  type LawAnnouncement,
  type TrackedLegalItem,
} from "@/lib/law-change-match";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://hmsnova.no";

const LOVTIDEND_URLS = [
  "https://lovdata.no/register/lovtidend?avdeling=LTI",
  "https://lovdata.no/register/lovtidend?avdeling=LTI&q=arbeidsmilj%C3%B8",
  "https://lovdata.no/register/lovtidend?avdeling=LTI&q=internkontroll",
  "https://lovdata.no/register/lovtidend?avdeling=LTI&q=byggherre",
];
const ARBEIDSTILSYNET_URL = "https://www.arbeidstilsynet.no/nyheter/";
const FETCH_TIMEOUT_MS = 20000;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HMSNova-LawMonitor/1.0 (internkontroll; https://hmsnova.no)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function toTrackedReference(ref: {
  id: string;
  title: string;
  paragraphRef: string | null;
  industries: unknown;
}): TrackedLegalItem {
  const industries = Array.isArray(ref.industries)
    ? (ref.industries as string[])
    : ["all"];
  return {
    id: ref.id,
    title: ref.title,
    paragraphRef: ref.paragraphRef,
    industries,
  };
}

function toTrackedRequirement(req: {
  id: string;
  title: string;
  legalBasis: string;
}): TrackedLegalItem {
  return {
    id: req.id,
    title: req.title,
    legalBasis: req.legalBasis,
    industries: ["all"],
  };
}

async function collectAnnouncements(): Promise<LawAnnouncement[]> {
  const announcements: LawAnnouncement[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const url of LOVTIDEND_URLS) {
    try {
      const html = await fetchHtml(url);
      for (const item of extractLovtidendAnnouncements(html)) {
        if (seen.has(`${item.source}:${item.externalId}`)) continue;
        seen.add(`${item.source}:${item.externalId}`);
        announcements.push(item);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Lovtidend feilet");
    }
  }

  try {
    const html = await fetchHtml(ARBEIDSTILSYNET_URL);
    for (const item of extractArbeidstilsynetAnnouncements(html)) {
      if (seen.has(`${item.source}:${item.externalId}`)) continue;
      seen.add(`${item.source}:${item.externalId}`);
      announcements.push(item);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Arbeidstilsynet feilet");
  }

  if (announcements.length === 0 && errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return announcements;
}

export async function scanLawChanges(options?: { notifyStaff?: boolean }) {
  const startedAt = new Date();
  let fetched = 0;
  let matched = 0;
  let created = 0;
  let errorMessage: string | null = null;

  try {
    const [references, requirements, announcements] = await Promise.all([
      prisma.legalReference.findMany({
        select: { id: true, title: true, paragraphRef: true, industries: true },
      }),
      prisma.regulatoryRequirement.findMany({
        select: { id: true, title: true, legalBasis: true },
      }),
      collectAnnouncements(),
    ]);

    fetched = announcements.length;
    const tracked = {
      references: references.map(toTrackedReference),
      requirements: requirements.map(toTrackedRequirement),
    };

    for (const announcement of announcements) {
      const match = matchAnnouncement(announcement, tracked);
      if (!match) continue;
      matched += 1;

      const existing = await prisma.lawChange.findUnique({
        where: {
          source_externalId: {
            source: match.announcement.source,
            externalId: match.announcement.externalId,
          },
        },
      });
      if (existing) continue;

      await prisma.lawChange.create({
        data: {
          source: match.announcement.source,
          externalId: match.announcement.externalId,
          title: match.announcement.title,
          summary: match.announcement.summary ?? null,
          sourceUrl: match.announcement.sourceUrl,
          publishedAt: match.announcement.publishedAt ?? null,
          matchedKeywords: match.matchedKeywords,
          affectedIndustries: match.affectedIndustries,
          legalReferenceIds: match.legalReferenceIds,
          requirementIds: match.requirementIds,
          status: "DETECTED",
        },
      });
      created += 1;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Ukjent feil";
  }

  await prisma.lawChangeScan.create({
    data: {
      startedAt,
      finishedAt: new Date(),
      fetched,
      matched,
      created,
      error: errorMessage,
    },
  });

  if (!errorMessage && options?.notifyStaff) {
    await notifyStaffToReviewAndPublish(created);
  }

  return {
    success: !errorMessage,
    fetched,
    matched,
    created,
    error: errorMessage,
  };
}

async function notifyStaffToReviewAndPublish(created: number) {
  const pending = await prisma.lawChange.findMany({
    where: { status: "DETECTED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { title: true, source: true },
  });
  if (pending.length === 0) return;

  const staff = await prisma.user.findMany({
    where: { OR: [{ isSuperAdmin: true }, { isSupport: true }] },
    select: { email: true },
  });

  const items = pending
    .map((change) => `<li>${escapeHtml(change.title)}</li>`)
    .join("");
  const subject =
    created > 0
      ? `Ukentlig regelverkssjekk: ${created} nye treff`
      : `Ukentlig regelverkssjekk: ${pending.length} treff venter`;

  await Promise.all(
    staff
      .filter((user) => user.email)
      .map((user) =>
        sendEmail({
          to: user.email,
          subject,
          html: `
            <p>Mandagsskanningen av Norsk Lovtidend og Arbeidstilsynet er ferdig.</p>
            <p><strong>${created}</strong> nye treff denne uken. <strong>${pending.length}</strong> venter på vurdering.</p>
            <p>Oppdater teksten i juridisk register ved behov, og varsle berørte bedrifter.</p>
            <ul>${items}</ul>
            <p><a href="${APP_URL}/admin/lovendringer">Åpne lovendringer</a></p>
          `,
        }).catch(() => undefined)
      )
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
