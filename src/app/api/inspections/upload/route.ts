import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

/**
 * POST /api/inspections/upload
 * Upload images for inspection findings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ingen fil lastet opp", 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Ugyldig filtype. Kun JPG, PNG og WebP er tillatt",
        400
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Filen er for stor. Maks 10MB",
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `inspections/${session.user.id}/${timestamp}-${sanitizedFileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const url = `/api/inspections/images/${encodeURIComponent(key)}`;

    return createSuccessResponse({ key, url }, "Bilde lastet opp", 201);
  } catch (error) {
    console.error("[Inspection Upload] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke laste opp bilde", 500);
  }
}

/**
 * DELETE /api/inspections/upload
 * Delete uploaded image
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ingen nøkkel spesifisert", 400);
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    return createSuccessResponse(undefined, "Bilde slettet");
  } catch (error) {
    console.error("[Inspection Upload DELETE] Error:", error);
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Kunne ikke slette bilde", 500);
  }
}

