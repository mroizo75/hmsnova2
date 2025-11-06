import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Ikke autorisert" },
        { status: 401 }
      );
    }

    // Hent kjemikalie og sjekk at den tilhører brukerens tenant
    const chemical = await prisma.chemical.findUnique({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!chemical) {
      return NextResponse.json(
        { error: "Kjemikalie ikke funnet" },
        { status: 404 }
      );
    }

    if (!chemical.sdsKey) {
      return NextResponse.json(
        { error: "Sikkerhetsdatablad mangler" },
        { status: 404 }
      );
    }

    // Generer signert URL for nedlasting fra R2
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: chemical.sdsKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 time
    });

    // Redirect til den signerte URLen
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Feil ved nedlasting av SDS:", error);
    return NextResponse.json(
      { error: "Kunne ikke laste ned sikkerhetsdatablad" },
      { status: 500 }
    );
  }
}

