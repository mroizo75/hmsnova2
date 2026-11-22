import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateFileKey, getStorage } from "@/lib/storage";
import { validateImageFile } from "@/lib/file-validation";
import { checkRateLimitPolicy, createRateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MEASURE_OBJECT_TYPE = "MEASURE";
const MAX_PHOTOS = 8;
const MAX_BYTES = 8 * 1024 * 1024;

const photoSelect = {
  id: true,
  fileKey: true,
  name: true,
  mime: true,
  size: true,
  createdAt: true,
} as const;

async function tenantIdForSession() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!session?.user?.id || !tenantId) return null;
  return { userId: session.user.id, tenantId };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await tenantIdForSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const measure = await prisma.measure.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!measure) {
      return NextResponse.json({ error: "Tiltak ikke funnet" }, { status: 404 });
    }

    const photos = await prisma.attachment.findMany({
      where: { tenantId: auth.tenantId, objectType: MEASURE_OBJECT_TYPE, objectId: id },
      orderBy: { createdAt: "asc" },
      select: photoSelect,
    });
    return NextResponse.json({ data: photos });
  } catch (error) {
    console.error("[MEASURE_PHOTOS_GET]", error);
    return NextResponse.json({ error: "Kunne ikke hente bilder" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await tenantIdForSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimitPolicy({
      policy: "upload",
      scope: "measure-photo",
      identifiers: [auth.userId, auth.tenantId],
      failClosed: true,
    });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const { id } = await params;
    const measure = await prisma.measure.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!measure) {
      return NextResponse.json({ error: "Tiltak ikke funnet" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "Ingen bilder ble sendt med" }, { status: 400 });
    }

    const existingCount = await prisma.attachment.count({
      where: { tenantId: auth.tenantId, objectType: MEASURE_OBJECT_TYPE, objectId: id },
    });
    if (existingCount + files.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maks ${MAX_PHOTOS} bilder per tiltak.` }, { status: 400 });
    }

    const storage = getStorage();
    const created = [];

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Et av bildene er for stort. Maks 8 MB per bilde." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = await validateImageFile(buffer);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error ?? "Ugyldig bilde" }, { status: 400 });
      }

      // ISO 45001:2018 kap. 10.2 — dokumentasjon av at korrigerende tiltak er gjennomført.
      const fileKey = generateFileKey(auth.tenantId, `measures/${id}`, file.name || "tiltak.jpg");
      const body = new Blob([new Uint8Array(buffer)], {
        type: validation.detectedType || "image/jpeg",
      });
      await storage.upload(fileKey, body);
      try {
        const photo = await prisma.attachment.create({
          data: {
            tenantId: auth.tenantId,
            objectType: MEASURE_OBJECT_TYPE,
            objectId: id,
            fileKey,
            name: file.name || "tiltak.jpg",
            mime: validation.detectedType || file.type || "image/jpeg",
            size: file.size,
            uploadedById: auth.userId,
          },
          select: photoSelect,
        });
        created.push(photo);
      } catch (error) {
        await storage.delete(fileKey);
        throw error;
      }
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[MEASURE_PHOTOS_POST]", error);
    return NextResponse.json({ error: "Kunne ikke laste opp bilder" }, { status: 500 });
  }
}
