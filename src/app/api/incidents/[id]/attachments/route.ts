import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;

    const incident = await prisma.incident.findUnique({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json({ error: "Avvik ikke funnet" }, { status: 404 });
    }

    const formData = await request.formData();
    const images = formData.getAll("images") as File[];
    const storage = getStorage();
    const created: string[] = [];

    for (const image of images) {
      if (!image || image.size === 0) continue;
      const fileKey = generateFileKey(tenantId, "incidents", image.name);
      await storage.upload(fileKey, image);
      await prisma.attachment.create({
        data: {
          tenantId,
          incidentId: id,
          fileKey,
          name: image.name,
          mime: image.type,
          size: image.size,
        },
      });
      created.push(fileKey);
    }

    return NextResponse.json({ success: true, count: created.length }, { status: 201 });
  } catch (error: any) {
    console.error("[INCIDENT_ATTACHMENTS]", error);
    return NextResponse.json(
      { error: error.message || "Kunne ikke laste opp bilder" },
      { status: 500 }
    );
  }
}
