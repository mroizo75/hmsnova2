import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/server/actions/notification.actions";

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
  actions: z.array(z.any()).optional(),
  outcome: z.string().optional(),
  closedReason: z.string().optional(),
});

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

    const allowedRoles = ["ADMIN", "HMS"];
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await db.whistleblowing.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: report });
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

    const allowedRoles = ["ADMIN", "HMS"];
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateWhistleblowSchema.parse(body);

    const existing = await db.whistleblowing.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = { ...validatedData };

    if (validatedData.actions !== undefined) {
      updateData.actions = JSON.stringify(validatedData.actions);
    }

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
      data: updateData,
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
        type: "WHISTLEBLOWING",
        title: "Varslingssak tildelt deg",
        message: `Sak ${existing.caseNumber}: ${existing.title} er tildelt deg for behandling.`,
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
