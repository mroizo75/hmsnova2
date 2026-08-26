import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.corporateGroupId) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const groupId = session.user.corporateGroupId;

  const membership = await prisma.corporateGroupUser.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });

  if (!membership || membership.role !== "GROUP_ADMIN") {
    return NextResponse.json({ error: "Kun konsern-admin kan laste opp logo" }, { status: 403 });
  }

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
  const key = `logos/konsern/${groupId}/logo.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    })
  );

  const logoUrl = `/api/files/${key}`;

  await prisma.corporateGroup.update({
    where: { id: groupId },
    data: { logo: logoUrl },
  });

  return NextResponse.json({ success: true, logoUrl });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.corporateGroupId) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const groupId = session.user.corporateGroupId;

  const membership = await prisma.corporateGroupUser.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });

  if (!membership || membership.role !== "GROUP_ADMIN") {
    return NextResponse.json({ error: "Kun konsern-admin kan endre logo" }, { status: 403 });
  }

  await prisma.corporateGroup.update({
    where: { id: groupId },
    data: { logo: null },
  });

  return NextResponse.json({ success: true });
}
