import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";
import type { HandbookSectionData } from "@/server/actions/hms-handbok.actions";

const flattenSections = (
  sections: HandbookSectionData[],
): Array<{ id: string; sectionNumber: string; title: string; content: string }> => {
  return sections.flatMap((section) => [
    {
      id: section.id,
      sectionNumber: section.sectionNumber,
      title: section.title,
      content: section.content,
    },
    ...flattenSections(section.children ?? []),
  ]);
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const data = await fetchHmsHandbok({ forEmployee: true });
    if (!data?.handbook?.currentVersion) {
      return NextResponse.json({ handbook: null }, { status: 200 });
    }

    const version = data.handbook.currentVersion;
    const signedByMe = (data.handbook.signatures ?? []).some(
      (signature: { userId: string }) => signature.userId === session.user.id,
    );

    return NextResponse.json({
      handbook: {
        id: data.handbook.id,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        hmsContactName: data.hmsContactName ?? null,
        hmsContactPhone: data.hmsContactPhone ?? null,
        versionId: version.id,
        version: version.version,
        status: version.status,
        lastReviewedAt: data.handbook.lastReviewedAt,
        signedByMe,
        signatureCount: version.signatureCount,
        totalEmployees: version.totalEmployees,
        sections: flattenSections(version.sections ?? []).filter((section) => section.title.trim().length > 0),
      },
    });
  } catch (error) {
    console.error("[Mobile Handbook] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente håndboken" }, { status: 500 });
  }
}
