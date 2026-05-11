import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import type { StorageAdapter } from "@/lib/storage-types";

export type { StorageAdapter } from "@/lib/storage-types";

// R2/S3 Storage (Anbefalt). Ingen fs – unngår Turbopack NFT-varsler for vanlige importer.
export class R2Storage implements StorageAdapter {
  readonly kind = "r2" as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || "hmsnova";
  }

  async upload(key: string, file: Blob | Buffer, metadata?: Record<string, string>): Promise<string> {
    const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType:
          file instanceof Buffer ? "application/octet-stream" : (file as Blob).type || "application/octet-stream",
      })
    );

    return key;
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return null;
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Error getting file from R2:", error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
}

let cachedLocalAdapter: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if ((process.env.STORAGE_TYPE || "r2") === "local") {
    if (!cachedLocalAdapter) {
      const { LocalStorage } = require(/* turbopackIgnore: true */ "./storage-local") as typeof import("./storage-local");
      cachedLocalAdapter = new LocalStorage();
    }
    return cachedLocalAdapter;
  }

  return new R2Storage();
}

export function generateFileKey(tenantId: string, folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = path.extname(filename);
  const base = path.basename(filename, ext).replace(/[^a-z0-9]/gi, "-").toLowerCase();

  return `${tenantId}/${folder}/${timestamp}-${random}-${base}${ext}`;
}

export async function deleteTenantFiles(tenantId: string): Promise<{ deleted: number; errors: number }> {
  if ((process.env.STORAGE_TYPE || "r2") === "local") {
    const { deleteLocalTenantFiles } = await import(/* turbopackIgnore: true */ "./storage-local");
    return deleteLocalTenantFiles(tenantId);
  }

  const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: true,
  });

  const bucket = process.env.R2_BUCKET || "hmsnova";
  let deleted = 0;
  let errors = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${tenantId}/`,
      ContinuationToken: continuationToken,
    });

    const listResponse = await client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key! })),
        },
      });

      const deleteResponse = await client.send(deleteCommand);
      deleted += deleteResponse.Deleted?.length || 0;
      errors += deleteResponse.Errors?.length || 0;
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return { deleted, errors };
}
