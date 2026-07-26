import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { GjestSakStatus } from "@/features/hms-tavle/components/gjest-sak-status";
import {
  normalizeGuestLocale,
  type GuestStatus,
  type GuestType,
} from "@/features/hms-tavle/lib/gjesteservice-config";
import { getGuestDictionary } from "@/features/hms-tavle/lib/guest-i18n";

/**
 * Privat statusside for gjesten. Nås kun med hemmelig sporingstoken og skal
 * aldri indekseres – GDPR art. 5 (dataminimering, formålsbegrensning).
 */
export const metadata: Metadata = {
  title: "Din sak – HMS Nova",
  robots: { index: false, follow: false, nocache: true },
};

interface Props {
  params: Promise<{ trackingToken: string }>;
}

export default async function GjestSakPage({ params }: Props) {
  const { trackingToken } = await params;

  const submission = await prisma.tavleGuestSubmission.findUnique({
    where: { trackingToken },
    select: {
      type: true,
      status: true,
      locale: true,
      createdAt: true,
      acknowledgedAt: true,
      respondedAt: true,
      closedAt: true,
      response: true,
      tavle: { select: { name: true, logoUrl: true, brandColor: true } },
    },
  });

  if (!submission) {
    const t = getGuestDictionary("nb");
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">{t.notFoundTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.notFoundBody}</p>
        </div>
      </div>
    );
  }

  return (
    <GjestSakStatus
      type={submission.type as GuestType}
      status={submission.status as GuestStatus}
      locale={normalizeGuestLocale(submission.locale)}
      createdAt={submission.createdAt.toISOString()}
      acknowledgedAt={submission.acknowledgedAt?.toISOString() ?? null}
      respondedAt={submission.respondedAt?.toISOString() ?? null}
      closedAt={submission.closedAt?.toISOString() ?? null}
      response={submission.response}
      tavleName={submission.tavle.name}
      logoUrl={submission.tavle.logoUrl}
      brandColor={submission.tavle.brandColor}
    />
  );
}
