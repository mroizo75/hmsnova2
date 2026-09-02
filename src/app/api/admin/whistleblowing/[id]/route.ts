import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/server/actions/notification.actions";
import {
  canHandleWhistleblowingCases,
  canViewWhistleblowingContent,
} from "@/lib/whistleblowing-access";
import { isAccusedOfCase } from "@/lib/whistleblowing-impartiality";

export const dynamic = "force-dynamic";

const updateWhistleblowSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "ACKNOWLEDGED",
    "UNDER_INVESTIGATION",
    "ACTION_TAKEN",
    "RESOLVED",
    "CLOSED",
    "DISMISSED",
  ]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  // nullable() slik at null fjerner tildeling
  assignedTo: z.string().nullable().optional(),
  investigationNotes: z.string().optional(),
  outcome: z.string().optional(),
  closedReason: z.string().optional(),
});

async function loadCaseForHandler(id: string, tenantId: string, userId: string) {
  const report = await db.whistleblowing.findFirst({
    where: { id, tenantId },
    include: {
      messages: { orderBy: { createdAt: "asc" as const } },
      parties: { where: { role: "ACCUSED" }, select: { userId: true } },
    },
  });
  if (!report) return { error: "Not found" as const, status: 404 as const };
  const accusedUserIds = report.parties
    .map((party) => party.userId)
    .filter((partyId): partyId is string => Boolean(partyId));
  if (isAccusedOfCase(userId, accusedUserIds)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }
  const { parties: _parties, ...safe } = report;
  return { data: safe };
}

// GET /api/admin/whistleblowing/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewWhistleblowingContent(session.user.role) || !session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await loadCaseForHandler(id, session.user.tenantId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error("[ADMIN_WHISTLEBLOWING_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/whistleblowing/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canHandleWhistleblowingCases(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateWhistleblowSchema.parse(body);

    const existingResult = await loadCaseForHandler(id, session.user.tenantId, session.user.id);
    if ("error" in existingResult) {
      return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
    }
    const existing = existingResult.data;

    if (validatedData.assignedTo) {
      const assignee = await db.userTenant.findFirst({
        where: {
          userId: validatedData.assignedTo,
          tenantId: session.user.tenantId,
          role: "VARSLINGSANSVARLIG",
        },
        select: { userId: true },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Saken kan bare tildeles en varslingsansvarlig" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...validatedData };

    // Tidsstempler per statusovergang (AML § 2A-3)
    if (validatedData.status === "ACKNOWLEDGED" && !existing.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
      updateData.handledBy = session.user.id;
    }
    if (validatedData.status === "UNDER_INVESTIGATION" && !existing.investigatedAt) {
      updateData.investigatedAt = new Date();
    }
    if (
      (validatedData.status === "RESOLVED" ||
        validatedData.status === "CLOSED" ||
        validatedData.status === "DISMISSED") &&
      !existing.closedAt
    ) {
      updateData.closedAt = new Date();
    }

    const report = await db.whistleblowing.update({
      where: { id },
      data: updateData as Parameters<typeof db.whistleblowing.update>[0]["data"],
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Varsle ny saksbehandler når saken tildeles
    const newAssignee = validatedData.assignedTo;
    if (
      newAssignee &&
      newAssignee !== existing.assignedTo &&
      newAssignee !== session.user.id
    ) {
      createNotification({
        tenantId: session.user.tenantId,
        userId: newAssignee,
        type: "CONFIDENTIAL_ACCESS",
        title: "Konfidensiell sak",
        message: "Du har fått tilgang til en konfidensiell sak",
        link: `/dashboard/whistleblowing/${id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ data: report });
  } catch (error: any) {
    console.error("[ADMIN_WHISTLEBLOWING_PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
