import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;

    if (!session?.user || !tenantId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Ikke autorisert" },
        { status: 401 }
      );
    }

    const { id: projectId, attachmentId } = await params;
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        tenantId,
        objectType: "PROJECT",
        objectId: projectId,
      },
      select: {
        id: true,
        fileKey: true,
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { code: "ATTACHMENT_NOT_FOUND", message: "Vedlegg ikke funnet" },
        { status: 404 }
      );
    }

    const storage = getStorage();
    await storage.delete(attachment.fileKey);

    await prisma.attachment.delete({
      where: { id: attachment.id },
    });

    return NextResponse.json({
      code: "OK",
      message: "Vedlegg slettet",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "DELETE_FAILED",
        message: "Kunne ikke slette vedlegg",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
