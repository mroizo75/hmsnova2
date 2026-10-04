import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
} from "@/lib/rate-limit";
import { validateFileSize, validateImageFile } from "@/lib/file-validation";

const MAX_SJA_IMAGES = 5;
const MAX_SJA_IMAGE_MB = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimitPolicy({
      policy: "upload",
      scope: "sja-upload",
      identifiers: [
        session.user.id,
        session.user.tenantId,
      ],
      failClosed: true,
    });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
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
    if (images.length > MAX_SJA_IMAGES) {
      return NextResponse.json(
        { error: `Maksimalt ${MAX_SJA_IMAGES} bilder er tillatt` },
        { status: 400 },
      );
    }

    const validatedImages: Array<{
      file: File;
      buffer: Buffer;
      detectedType: string;
    }> = [];
    for (const image of images) {
      if (!(image instanceof File) || image.size === 0) {
        return NextResponse.json({ error: "En av bildefilene er tom eller ugyldig" }, { status: 400 });
      }
      const sizeValidation = validateFileSize(image.size, MAX_SJA_IMAGE_MB);
      if (!sizeValidation.isValid) {
        return NextResponse.json({ error: sizeValidation.error }, { status: 400 });
      }
      const buffer = Buffer.from(await image.arrayBuffer());
      const fileValidation = await validateImageFile(buffer);
      if (!fileValidation.isValid || !fileValidation.detectedType) {
        return NextResponse.json(
          { error: fileValidation.error || "Ugyldig bildeformat" },
          { status: 400 },
        );
      }
      validatedImages.push({
        file: image,
        buffer,
        detectedType: fileValidation.detectedType,
      });
    }

    const storage = getStorage();
    const uploaded: string[] = [];

    for (const image of validatedImages) {
      const fileKey = generateFileKey(tenantId, `sja/${sjaAnalysisId}`, image.file.name);
      await storage.upload(fileKey, image.buffer);

      await prisma.attachment.create({
        data: {
          tenantId,
          sjaAnalysisId,
          fileKey,
          name: image.file.name,
          mime: image.detectedType,
          size: image.file.size,
        },
      });

      uploaded.push(fileKey);
    }

    return NextResponse.json({ success: true, count: uploaded.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
