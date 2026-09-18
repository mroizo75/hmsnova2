import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MEETING_OBJECT_TYPE = "MEETING";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!session?.user || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: meetingId, attachmentId } = await params;
    const meeting = await db.meeting.findFirst({
      where: { id: meetingId, tenantId },
      select: { id: true },
    });
    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const attachment = await db.attachment.findFirst({
      where: {
        id: attachmentId,
        tenantId,
        objectType: MEETING_OBJECT_TYPE,
        objectId: meetingId,
      },
      select: { id: true, fileKey: true },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Vedlegg ikke funnet" }, { status: 404 });
    }

    const storage = getStorage();
    await storage.delete(attachment.fileKey);
    await db.attachment.delete({ where: { id: attachment.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MEETING_ATTACHMENT_DELETE]", error);
    return NextResponse.json({ error: "Kunne ikke slette vedlegg" }, { status: 500 });
  }
}
