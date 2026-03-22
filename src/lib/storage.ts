import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

/** Lokal lagringsrot. turbopackIgnore hindrer at NFT-tracer følger hele repoet via process.cwd(). */
function getLocalStorageRoot(): string {
  const fromEnv = process.env.LOCAL_STORAGE_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
}

export interface StorageAdapter {
  upload(key: string, file: Blob | Buffer, metadata?: Record<string, string>): Promise<string>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

// R2/S3 Storage (Anbefalt)
export class R2Storage implements StorageAdapter {
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
      forcePathStyle: true, // Viktig for R2!
    });
    this.bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || "hmsnova";
  }

  async upload(key: string, file: Blob | Buffer, metadata?: Record<string, string>): Promise<string> {
    const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());
    
    // Fjern metadata for å unngå encoding-problemer med norske tegn
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file instanceof Buffer ? "application/octet-stream" : (file as Blob).type || "application/octet-stream",
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
      for await (const chunk of response.Body as any) {
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

// Lokal fillagring (Backup-løsning)
export class LocalStorage implements StorageAdapter {
  private basePath: string;

  constructor() {
    this.basePath = getLocalStorageRoot();
  }

  async upload(key: string, file: Blob | Buffer): Promise<string> {
    const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());
    const filePath = path.join(this.basePath, key);
    
    // Opprett mapper hvis de ikke eksisterer
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return key;
  }

  async getUrl(key: string): Promise<string> {
    // For lokal lagring returnerer vi en API-rute som server filen
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.basePath, key);
      return await fs.readFile(filePath);
    } catch (error) {
      console.error("Error reading local file:", error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    await fs.unlink(filePath);
  }
}

// Factory function - velg storage basert på config
export function getStorage(): StorageAdapter {
  const storageType = process.env.STORAGE_TYPE || "r2"; // "r2" eller "local"

  if (storageType === "local") {
    return new LocalStorage();
  }

  return new R2Storage();
}

// Helper for å generere unike filnavn
export function generateFileKey(tenantId: string, folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = path.extname(filename);
  const base = path.basename(filename, ext).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  
  return `${tenantId}/${folder}/${timestamp}-${random}-${base}${ext}`;
}

// Slett alle filer for en tenant
export async function deleteTenantFiles(tenantId: string): Promise<{ deleted: number; errors: number }> {
  const storage = getStorage();
  let deleted = 0;
  let errors = 0;

  // For R2: List og slett alle objekter med prefix
  if (storage instanceof R2Storage) {
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
  }
  
  // For lokal lagring: Slett hele tenant-mappen
  else if (storage instanceof LocalStorage) {
    const fs = await import("fs/promises");
    const tenantPath = path.join(getLocalStorageRoot(), tenantId);
    
    try {
      await fs.rm(tenantPath, { recursive: true, force: true });
      deleted = 1; // Vi teller mappen som slettet
    } catch (error) {
      console.error(`Failed to delete tenant files for ${tenantId}:`, error);
      errors = 1;
    }
  }

  return { deleted, errors };
}

