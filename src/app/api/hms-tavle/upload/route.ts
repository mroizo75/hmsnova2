import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || process.env.S3_BUCKET || "hmsnova";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
];
const MAX_MB = 20;

/** Konverter R2-nøkkel til intern proxy-URL for bilder */
function toProxyUrl(key: string, appUrl: string): string {
  if (key.endsWith(".pdf")) return key; // PDF åpnes via signert URL ved klikk
  return `${appUrl}/api/hms-tavle/images/${key}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const tavleId = formData.get("tavleId") as string | null;

    if (!(file instanceof File)) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ingen fil lastet opp", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Kun bilder (JPEG, PNG, WebP) og PDF er tillatt",
        400
      );
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Filen er for stor. Maks ${MAX_MB} MB.`,
        400
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const key = `hms-tavle/${session.user.tenantId}/${tavleId ?? "general"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = toProxyUrl(key, appUrl);

    return createSuccessResponse({ url, key, name: file.name, type: file.type }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
