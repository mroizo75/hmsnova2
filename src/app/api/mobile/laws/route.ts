import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getRegulatoryStatusForTenant } from "@/server/actions/regulatory.actions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const status = await getRegulatoryStatusForTenant(session.user.tenantId);
    const laws = (status.requirements ?? [])
      .filter((requirement) => requirement.status !== "NOT_APPLICABLE")
      .map((requirement) => ({
        id: requirement.id,
        title: requirement.title,
        legalBasis: requirement.legalBasis,
        description: requirement.description ?? "",
        sourceUrl: requirement.sourceUrl ?? null,
        severity: requirement.severity,
      }));

    return NextResponse.json({
      hasProfile: status.hasProfile === true,
      laws,
    });
  } catch (error) {
    console.error("[Mobile Laws] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente regelverk" }, { status: 500 });
  }
}
