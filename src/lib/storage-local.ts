import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "@/lib/storage-types";

/** Lokal lagringsrot. turbopackIgnore hindrer at NFT-tracer følger hele repoet via process.cwd(). */
export function getLocalStorageRoot(): string {
  const fromEnv = process.env.LOCAL_STORAGE_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage");
}

/** Lokal fillagring (Backup). Kun lastet når STORAGE_TYPE=local. */
export class LocalStorage implements StorageAdapter {
  readonly kind = "local" as const;
  private basePath: string;

  constructor() {
    this.basePath = getLocalStorageRoot();
  }

  async upload(key: string, file: Blob | Buffer): Promise<string> {
    const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());
    const filePath = path.join(this.basePath, key);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return key;
  }

  async getUrl(key: string): Promise<string> {
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

export async function deleteLocalTenantFiles(
  tenantId: string
): Promise<{ deleted: number; errors: number }> {
  const tenantPath = path.join(getLocalStorageRoot(), tenantId);
  try {
    await fs.rm(tenantPath, { recursive: true, force: true });
    return { deleted: 1, errors: 0 };
  } catch (error) {
    console.error(`Failed to delete tenant files for ${tenantId}:`, error);
    return { deleted: 0, errors: 1 };
  }
}
