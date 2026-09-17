import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getAllowedNextMocStatuses, type MocStatus, type MocTransitionContext } from "@/lib/moc-workflow";
import { transitionMoc } from "@/server/actions/moc.actions";
import { fetchMocDetail } from "@/server/queries/moc.queries";

const statusValues: MocStatus[] = [
  "DRAFT",
  "IMPACT_ASSESSMENT",
  "PENDING_APPROVAL",
  "APPROVED",
  "IMPLEMENTING",
  "VERIFYING",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
];

const isMocStatus = (value: unknown): value is MocStatus => {
  return typeof value === "string" && statusValues.includes(value as MocStatus);
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { id } = await context.params;
    const data = await fetchMocDetail(id);
    if (!data?.moc) {
      return NextResponse.json({ error: "Endringssaken ble ikke funnet" }, { status: 404 });
    }

    const moc = data.moc as {
      id: string;
      number: string;
      title: string;
      description: string;
      status: MocStatus;
      changeType: string;
      classification: MocTransitionContext["classification"];
      duration: MocTransitionContext["duration"];
      source: MocTransitionContext["source"];
      hseImpact: string;
      environmentalImpact: string | null;
      impactAssessment: string | null;
      plannedEndAt: string | Date | null;
      informedAt: string | Date | null;
      verificationNote: string | null;
      voReviewedAt: string | Date | null;
      proposedBy?: { name?: string | null } | null;
      riskLinks?: unknown[];
    };

    const ctx: MocTransitionContext = {
      classification: moc.classification,
      source: moc.source,
      duration: moc.duration,
      hasImpactAssessment: Boolean(moc.impactAssessment?.trim()),
      hasEnvironmentalImpact: Boolean(moc.environmentalImpact?.trim()),
      hasRiskLink: (moc.riskLinks?.length ?? 0) > 0,
      hasVoReview: Boolean(moc.voReviewedAt),
      hasPlannedEnd: Boolean(moc.plannedEndAt),
      hasInformed: Boolean(moc.informedAt),
      hasVerification: Boolean(moc.verificationNote?.trim()),
    };

    return NextResponse.json({
      moc: {
        id: moc.id,
        number: moc.number,
        title: moc.title,
        description: moc.description,
        status: moc.status,
        changeType: moc.changeType,
        classification: moc.classification,
        duration: moc.duration,
        source: moc.source,
        hseImpact: moc.hseImpact,
        environmentalImpact: moc.environmentalImpact,
        impactAssessment: moc.impactAssessment,
        proposedByName: moc.proposedBy?.name ?? null,
        canApprove: Boolean(data.permissions?.canApprove),
        allowedNextStatuses: getAllowedNextMocStatuses(moc.status, ctx),
      },
    });
  } catch (error) {
    console.error("[Mobile MoC detail GET]", error);
    return NextResponse.json({ error: "Kunne ikke hente endringssak" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { to?: string; rejectedReason?: string };
    if (!isMocStatus(body.to)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }

    const result = await transitionMoc({
      id,
      to: body.to,
      rejectedReason: body.rejectedReason,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Kunne ikke oppdatere status" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Mobile MoC PATCH]", error);
    return NextResponse.json({ error: "Kunne ikke oppdatere endringssak" }, { status: 500 });
  }
}
