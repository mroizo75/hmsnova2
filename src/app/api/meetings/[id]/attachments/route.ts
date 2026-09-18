import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateFileKey, getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MEETING_OBJECT_TYPE = "MEETING";
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
]);

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

async function getMeetingForTenant(meetingId: string, tenantId: string) {
  return db.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!session?.user || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await getMeetingForTenant(id, tenantId);
    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const files = await db.attachment.findMany({
      where: { tenantId, objectType: MEETING_OBJECT_TYPE, objectId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fileKey: true,
        name: true,
        mime: true,
        size: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: files });
  } catch (error: any) {
    console.error("[MEETING_ATTACHMENTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!session?.user || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await getMeetingForTenant(id, tenantId);
    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((entry) => entry instanceof File) as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "Ingen filer ble sendt med" }, { status: 400 });
    }

    const storage = getStorage();
    const created = [];

    for (const file of files) {
      if (file.size === 0) continue;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Filen "${file.name}" overskrider maksgrensen på 20 MB` },
          { status: 400 }
        );
      }

      const ext = fileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `Filtypen "${ext || file.name}" er ikke tillatt for møtereferat` },
          { status: 400 }
        );
      }

      const fileKey = generateFileKey(tenantId, `meetings/${id}`, file.name);
      await storage.upload(fileKey, file);
      try {
        const attachment = await db.attachment.create({
          data: {
            tenantId,
            // Lovforankring: AML § 7-2 — AMU skal føre protokoll/referat fra sine møter.
            objectType: MEETING_OBJECT_TYPE,
            objectId: id,
            fileKey,
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
            uploadedById: session.user.id,
          },
          select: {
            id: true,
            fileKey: true,
            name: true,
            mime: true,
            size: true,
            createdAt: true,
          },
        });
        created.push(attachment);
      } catch (error) {
        await storage.delete(fileKey);
        throw error;
      }
    }

    if (created.length === 0) {
      return NextResponse.json({ error: "Ingen gyldige filer å laste opp" }, { status: 400 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[MEETING_ATTACHMENTS_POST]", error);
    return NextResponse.json({ error: "Kunne ikke laste opp referat" }, { status: 500 });
  }
}
