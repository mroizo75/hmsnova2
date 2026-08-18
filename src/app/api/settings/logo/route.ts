/**
 * Logo-opplasting for tenant.
 * Laster opp til R2 og oppdaterer tenant.logoUrl.
 * Brukes i PDF-rapporter (pdf-brand.ts) og HMS Tavle.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT ?? process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET ?? process.env.S3_BUCKET ?? "hmsnova";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://app.hmsnova.no";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canUpdateSettings) {
    return NextResponse.json({ error: "Kun admin kan laste opp logo" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil mottatt" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Kun PNG, JPG, WebP og SVG støttes" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Filen er for stor (maks 2 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const key = `logos/${tenantId}/logo.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    })
  );

  // Bruk intern proxy-URL (samme mønster som HMS Tavle-bilder)
  const logoUrl = `${APP_URL}/api/files/${key}`;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoUrl },
  });

  return NextResponse.json({ success: true, logoUrl });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canUpdateSettings) {
    return NextResponse.json({ error: "Kun admin kan endre logo" }, { status: 403 });
  }

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { logoUrl: null },
  });

  return NextResponse.json({ success: true });
}
