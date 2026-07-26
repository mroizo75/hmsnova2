import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * GET /api/hms-tavle/images/[...key]
 *
 * Offentlig bilde-proxy for HMS Tavle (ingen innlogging nødvendig).
 * Genererer en kortvarig presigned URL mot Cloudflare R2 og
 * returnerer en 307-redirect — nettleser/CDN henter filen direkte.
 *
 * Sikkerhet: nøkkelen MÅ starte med "hms-tavle/" for å hindre
 * tilgang til andre deler av bucketen.
 */

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await params;
    const key = keyParts.join("/");

    // Kun tillat nøkler i hms-tavle/-prefikset
    if (!key.startsWith("hms-tavle/")) {
      return new NextResponse("Forbudt", { status: 403 });
    }

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch {
    return new NextResponse("Bildet ble ikke funnet", { status: 404 });
  }
}
