import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    const sjaAnalysisId = formData.get("sjaAnalysisId") as string;

    if (!tenantId || !sjaAnalysisId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const analysis = await prisma.sjaAnalysis.findUnique({
      where: { id: sjaAnalysisId, tenantId },
    });

    if (!analysis) {
      return NextResponse.json({ error: "SJA not found" }, { status: 404 });
    }

    const images = formData.getAll("images") as File[];
    const storage = getStorage();
    const uploaded: string[] = [];

    for (const image of images) {
      if (image && image.size > 0) {
        const fileKey = generateFileKey(tenantId, `sja/${sjaAnalysisId}`, image.name);
        await storage.upload(fileKey, image);

        await prisma.attachment.create({
          data: {
            tenantId,
            sjaAnalysisId,
            fileKey,
            name: image.name,
            mime: image.type,
            size: image.size,
          },
        });

        uploaded.push(fileKey);
      }
    }

    return NextResponse.json({ success: true, count: uploaded.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
