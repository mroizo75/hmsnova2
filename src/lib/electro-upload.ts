const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateElectroUploadFile(file: { size: number; type: string; name: string }): {
  code: string;
  message: string;
} | null {
  if (!file.name?.trim()) {
    return { code: "MISSING_FILE", message: "Velg en fil å laste opp." };
  }
  if (file.size <= 0) {
    return { code: "EMPTY_FILE", message: "Filen er tom." };
  }
  if (file.size > MAX_BYTES) {
    return { code: "FILE_TOO_LARGE", message: "Filen er for stor (maks 25 MB)." };
  }
  const mime = (file.type || "").trim() || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return {
      code: "UNSUPPORTED_TYPE",
      message: "Tillatte formater: PDF, Word (.docx) eller bilde (JPEG, PNG, WebP).",
    };
  }
  return null;
}
