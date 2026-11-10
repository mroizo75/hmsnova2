import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import { INCIDENT_IMAGE_MAX_COUNT, incidentImageRejection } from "@/lib/incident-image";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }

    const incident = await prisma.incident.findUnique({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json({ error: "Avvik ikke funnet" }, { status: 404 });
    }

    const formData = await request.formData();
    const images = formData.getAll("images").filter((entry): entry is File => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        "arrayBuffer" in entry &&
        typeof entry.size === "number" &&
        entry.size > 0
      );
    });
    const existingCount = await prisma.attachment.count({
      where: { incidentId: id, tenantId },
    });
    if (existingCount + images.length > INCIDENT_IMAGE_MAX_COUNT) {
      return NextResponse.json({ error: "Maks 5 bilder per avvik." }, { status: 400 });
    }
    for (const image of images) {
      const rejection = incidentImageRejection({
        name: image.name,
        type: image.type,
        size: image.size,
      });
      if (rejection) {
        return NextResponse.json({ error: rejection }, { status: 400 });
      }
    }
    const storage = getStorage();
    const created: string[] = [];

    for (const image of images) {
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
