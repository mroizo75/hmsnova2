export interface StorageAdapter {
  readonly kind: "r2" | "local";
  upload(key: string, file: Blob | Buffer, metadata?: Record<string, string>): Promise<string>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}
