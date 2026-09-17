import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { createMoc, transitionMoc, updateMoc } from "@/server/actions/moc.actions";
import { fetchMocList } from "@/server/queries/moc.queries";

type MocListItem = {
  id: string;
  number: string;
  title: string;
  status: string;
  classification: string;
  changeType: string;
  createdAt: string | Date;
  proposedBy?: { name?: string | null } | null;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const data = await fetchMocList();
    if (!data.moduleEnabled) {
      return NextResponse.json({ error: "Endringsledelse er ikke slått på" }, { status: 403 });
    }

    const items = ((data.items ?? []) as MocListItem[]).map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      status: item.status,
      classification: item.classification,
      changeType: item.changeType,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : item.createdAt.toISOString(),
      proposedByName: item.proposedBy?.name ?? null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Mobile MoC GET]", error);
    return NextResponse.json({ error: "Kunne ikke hente endringssaker" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const created = await createMoc(body);
    if (!created.success || !created.data?.id) {
      return NextResponse.json({ error: created.error ?? "Kunne ikke opprette endringssak" }, { status: 400 });
    }

    const mocId = created.data.id;
    const impactAssessment =
      typeof body.impactAssessment === "string" && body.impactAssessment.trim().length > 0
        ? body.impactAssessment.trim()
        : typeof body.hseImpact === "string"
          ? body.hseImpact
          : undefined;

    if (impactAssessment) {
      await updateMoc({
        id: mocId,
        impactAssessment,
        plannedEndAt: typeof body.plannedEndAt === "string" ? body.plannedEndAt : undefined,
      });
    }

    if (body.submitForApproval === true) {
      const toAssessment = await transitionMoc({ id: mocId, to: "IMPACT_ASSESSMENT" });
      if (!toAssessment.success) {
        return NextResponse.json(
          { id: mocId, number: created.data.number, error: toAssessment.error },
          { status: 201 },
        );
      }
      const toPending = await transitionMoc({ id: mocId, to: "PENDING_APPROVAL" });
      if (!toPending.success) {
        return NextResponse.json(
          { id: mocId, number: created.data.number, error: toPending.error },
          { status: 201 },
        );
      }
    }

    return NextResponse.json({ id: mocId, number: created.data.number }, { status: 201 });
  } catch (error) {
    console.error("[Mobile MoC POST]", error);
    return NextResponse.json({ error: "Kunne ikke opprette endringssak" }, { status: 500 });
  }
}
