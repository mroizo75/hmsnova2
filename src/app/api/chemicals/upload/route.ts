import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { generateFileKey } from "@/lib/storage";
import { validatePdfFile, validateFileSize } from "@/lib/file-validation";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "hmsnova";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Ingen tenant tilknyttet" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Ingen fil lastet opp" },
        { status: 400 }
      );
    }

    // Validate file size first
    const sizeValidation = validateFileSize(file.size, 10);
    if (!sizeValidation.isValid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Get file properties
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "unknown.pdf";

    // SIKKERHET: Valider faktisk filinnhold (magic bytes)
    const fileValidation = await validatePdfFile(fileBuffer);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    const fileSize = fileBuffer.length;

    // Generer tenant-spesifikk key
    const key = generateFileKey(tenantId, "chemicals/sds", fileName);

    // Last opp til R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileValidation.detectedType || "application/pdf",
      })
    );

    return NextResponse.json({
      key,
      success: true,
    });
  } catch (error) {
    console.error("[Chemical Upload] Error:", error);
    return NextResponse.json(
      { error: "Filopplasting feilet" },
      { status: 500 }
    );
  }
}

