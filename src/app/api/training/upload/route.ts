import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

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

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Ikke autorisert" },
        { status: 401 }
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

    // Konverter til Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "unknown";
    const fileType = file.type || "application/octet-stream";
    const fileSize = fileBuffer.length;

    // Valider filtype (kun PDF og bilder)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Kun PDF og bildefiler er tillatt" },
        { status: 400 }
      );
    }

    // Valider størrelse (maks 10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Filen er for stor (maks 10MB)" },
        { status: 400 }
      );
    }

    // Generer unik filnøkkel
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${session.user.tenantId}/training/certificates/${timestamp}-${random}-${sanitizedFileName}`;

    // Last opp til R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
      })
    );

    console.log(`Training certificate uploaded: ${key}`);

    return NextResponse.json({
      success: true,
      key,
    });
  } catch (error) {
    console.error("Training certificate upload error:", error);
    return NextResponse.json(
      { error: "Kunne ikke laste opp fil" },
      { status: 500 }
    );
  }
}

