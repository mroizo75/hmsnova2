import { NextRequest, NextResponse } from "next/server";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateManagementReviewSchema = z.object({
  title: z.string().optional(),
  reviewDate: z.string().datetime().optional(),
  period: z.string().optional(),
  conductedBy: z.string().optional(),
  participants: z.array(z.string()).optional(),
  hmsGoalsReview: z.string().optional(),
  incidentStatistics: z.string().optional(),
  riskReview: z.string().optional(),
  auditResults: z.string().optional(),
  trainingStatus: z.string().optional(),
  resourcesReview: z.string().optional(),
  externalChanges: z.string().optional(),
  wellbeingSummary: z.string().optional(),
  conclusions: z.string().optional(),
  decisions: z.array(z.any()).optional(),
  actionPlan: z.array(z.any()).optional(),
  nextReviewDate: z.string().datetime().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "APPROVED"]).optional(),
  approvedBy: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/management-reviews/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let tenantId = "";
    try {
      const tenantContext = await getRequiredTenantContext();
      tenantId = tenantContext.tenantId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const review = await db.managementReview.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: review });
  } catch (error: any) {
    console.error("[MANAGEMENT_REVIEW_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/management-reviews/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let tenantId = "";
    let userId = "";
    try {
      const tenantContext = await getRequiredTenantContext();
      tenantId = tenantContext.tenantId;
      userId = tenantContext.userId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateManagementReviewSchema.parse(body);

    const existing = await db.managementReview.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = { ...validatedData };

    if (validatedData.participants) {
      updateData.participants = JSON.stringify(validatedData.participants);
    }
    if (validatedData.decisions) {
      updateData.decisions = JSON.stringify(validatedData.decisions);
    }
    if (validatedData.actionPlan) {
      updateData.actionPlan = JSON.stringify(validatedData.actionPlan);
    }
    if (validatedData.nextReviewDate) {
      updateData.nextReviewDate = new Date(validatedData.nextReviewDate);
    }
    if (validatedData.status === "APPROVED" && !existing.approvedAt) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    const review = await db.managementReview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: review });
  } catch (error: any) {
    console.error("[MANAGEMENT_REVIEW_PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/management-reviews/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let tenantId = "";
    try {
      const tenantContext = await getRequiredTenantContext();
      tenantId = tenantContext.tenantId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.managementReview.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.managementReview.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MANAGEMENT_REVIEW_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

