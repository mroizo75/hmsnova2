import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateFileKey, getStorage } from "@/lib/storage";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;

    if (!session?.user || !tenantId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Ikke autorisert" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId, tenantId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { code: "PROJECT_NOT_FOUND", message: "Prosjekt ikke funnet" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry) => entry instanceof File) as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { code: "NO_FILES", message: "Ingen filer ble sendt med" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const created = [];

    for (const file of files) {
      if (file.size === 0) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            code: "FILE_TOO_LARGE",
            message: `Filen "${file.name}" overskrider maksgrensen på 50 MB`,
          },
          { status: 400 }
        );
      }

      const fileKey = generateFileKey(tenantId, `projects/${projectId}/attachments`, file.name);
      await storage.upload(fileKey, file);
      try {
        const attachment = await prisma.attachment.create({
          data: {
            tenantId,
            // Lovforankring: AML § 3-1 + Internkontrollforskriften § 5 (dokumentert HMS-oppfolging).
            objectType: "PROJECT",
            objectId: projectId,
            fileKey,
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
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

    return NextResponse.json({
      code: "OK",
      message: "Vedlegg lastet opp",
      attachments: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: "UPLOAD_FAILED",
        message: "Kunne ikke laste opp vedlegg",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
