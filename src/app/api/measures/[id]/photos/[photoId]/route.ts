import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MEASURE_OBJECT_TYPE = "MEASURE";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!session?.user?.id || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await params;
    const photo = await prisma.attachment.findFirst({
      where: {
        id: photoId,
        tenantId,
        objectType: MEASURE_OBJECT_TYPE,
        objectId: id,
      },
      select: { id: true, fileKey: true },
    });
    if (!photo) {
      return NextResponse.json({ error: "Bilde ikke funnet" }, { status: 404 });
    }
    if (!photo.fileKey.startsWith(`${tenantId}/measures/`)) {
      return NextResponse.json({ error: "Ugyldig bilde" }, { status: 400 });
    }

    const storage = getStorage();
    await storage.delete(photo.fileKey);
    await prisma.attachment.delete({ where: { id: photo.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MEASURE_PHOTO_DELETE]", error);
    return NextResponse.json({ error: "Kunne ikke slette bildet" }, { status: 500 });
  }
}
