import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { getLocalStorageRoot } from "@/lib/storage-local";
import path from "path";
import fs from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const fileKey = pathArray.join("/");
    const isPublicBlogImage = fileKey.startsWith("blog/images/");
    const session = await getServerSession(authOptions);
    if (!session && !isPublicBlogImage) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isPublicBlogImage) {
      const sessionTenantId = session?.user?.tenantId;
      if (!sessionTenantId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
      const ownedByTenant =
        fileKey.startsWith(`${sessionTenantId}/`) ||
        fileKey.startsWith(`logos/${sessionTenantId}/`);
      if (!ownedByTenant) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const storage = getStorage();

    // For lokal lagring
    if (storage.kind === "local") {
      const root = getLocalStorageRoot();
      const fullPath = path.join(root, fileKey);

      // Sikkerhet: Sørg for at filen er innenfor base path
      const realBasePath = await fs.realpath(root).catch(() => null);
      const realPath = await fs.realpath(fullPath).catch(() => null);
      if (!realBasePath) {
        return new NextResponse("Storage not configured", { status: 500 });
      }
      if (!realPath || !realPath.startsWith(realBasePath)) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const fileBuffer = await fs.readFile(realPath);
      const ext = path.extname(realPath).toLowerCase();
      const contentType = getContentType(ext);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${path.basename(realPath)}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // For R2 storage
    if (storage.kind === "r2") {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");

      const client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
      });

      const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || "hmsnova";

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      });

      const response = await client.send(command);
      
      if (!response.Body) {
        return new NextResponse("File not found", { status: 404 });
      }

      // Konverter stream til buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      const ext = path.extname(fileKey).toLowerCase();
      const contentType = response.ContentType || getContentType(ext);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${path.basename(fileKey)}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse("Storage not configured", { status: 500 });
  } catch (error: any) {
    console.error("File serve error:", error);
    return new NextResponse("File not found", { status: 404 });
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  return types[ext] || "application/octet-stream";
}

