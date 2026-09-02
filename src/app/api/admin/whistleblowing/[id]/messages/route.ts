import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/server/actions/notification.actions";
import { canHandleWhistleblowingCases } from "@/lib/whistleblowing-access";

export const dynamic = "force-dynamic";

const adminMessageSchema = z.object({
  message: z.string().min(1),
  isInternal: z.boolean().default(false),
});

// POST /api/admin/whistleblowing/[id]/messages - Admin add message
export async function POST(
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
    const { message, isInternal } = adminMessageSchema.parse(body);

    const report = await db.whistleblowing.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const newMessage = await db.whistleblowMessage.create({
      data: {
        whistleblowingId: id,
        sender: "HANDLER",
        senderUserId: session.user.id,
        message,
        isInternal,
      },
    });

    // Varsle tildelt saksbehandler (hvis en annen enn avsender) om ny melding
    if (report.assignedTo && report.assignedTo !== session.user.id) {
      createNotification({
        tenantId: session.user.tenantId,
        userId: report.assignedTo,
        type: "CONFIDENTIAL_ACCESS",
        title: "Konfidensiell sak",
        message: "Du har fått tilgang til en konfidensiell sak",
        link: `/dashboard/whistleblowing/${id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ data: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN_WHISTLEBLOWING_MESSAGE_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
