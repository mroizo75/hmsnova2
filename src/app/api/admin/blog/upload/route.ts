import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
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

    // Get file properties
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "unknown";
    const fileType = file.type || "application/octet-stream";
    const fileSize = fileBuffer.length;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Ugyldig filtype. Kun JPEG, PNG, WebP og GIF er tillatt." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "Filen er for stor. Maksimal størrelse er 5MB." },
        { status: 400 }
      );
    }

    // Generate unique key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `blog/images/${timestamp}-${sanitizedFileName}`;

    // Upload to R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
      })
    );

    // Generate signed URL for public access (7 days expiry - R2 max)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

    return NextResponse.json({
      url,
      key,
      success: true,
    });
  } catch (error) {
    console.error("[Blog Upload] Error:", error);
    return NextResponse.json(
      { error: "Bildeopplasting feilet" },
      { status: 500 }
    );
  }
}
