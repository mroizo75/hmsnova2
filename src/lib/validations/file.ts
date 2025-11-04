import { z } from "zod";

/**
 * SIKKERHET: File Upload Validation
 * 
 * Validerer filer for størrelse, type og innhold før opplasting.
 */

// Max file sizes (in bytes)
export const MAX_FILE_SIZE = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  GENERAL: 25 * 1024 * 1024, // 25MB
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  VIDEO: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",
  ],
} as const;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = {
  IMAGE: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  DOCUMENT: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"],
  VIDEO: [".mp4", ".mpeg", ".mov", ".webm"],
} as const;

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

/**
 * Valider fil størrelse
 */
export function validateFileSize(
  size: number,
  maxSize: number = MAX_FILE_SIZE.GENERAL
): { valid: boolean; error?: string } {
  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Filen er for stor. Maksimal størrelse er ${maxSizeMB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Valider fil type (MIME type)
 */
export function validateFileMimeType(
  mimeType: string,
  allowedTypes: readonly string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Ugyldig filtype. Tillatte typer: ${allowedTypes.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Valider fil extension
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: readonly string[]
): { valid: boolean; error?: string } {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Ugyldig filtype. Tillatte typer: ${allowedExtensions.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Valider fil navn (sikkerhet)
 */
export function validateFileName(filename: string): { valid: boolean; error?: string } {
  // Sjekk for directory traversal attempts
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return {
      valid: false,
      error: "Ugyldig filnavn (kan ikke inneholde .. / eller \\)",
    };
  }

  // Sjekk for spesialtegn
  if (!/^[a-zA-Z0-9\-_. æøåÆØÅ]+$/.test(filename)) {
    return {
      valid: false,
      error: "Filnavnet inneholder ugyldige tegn",
    };
  }

  // Sjekk lengde
  if (filename.length > 255) {
    return {
      valid: false,
      error: "Filnavnet er for langt (maks 255 tegn)",
    };
  }

  return { valid: true };
}

/**
 * Komplett fil validering
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedMimeTypes?: readonly string[];
    allowedExtensions?: readonly string[];
  } = {}
): FileValidationResult {
  const {
    maxSize = MAX_FILE_SIZE.GENERAL,
    allowedMimeTypes,
    allowedExtensions,
  } = options;

  // Valider filnavn
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return { valid: false, error: nameValidation.error };
  }

  // Valider størrelse
  const sizeValidation = validateFileSize(file.size, maxSize);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error };
  }

  // Valider MIME type
  if (allowedMimeTypes) {
    const mimeValidation = validateFileMimeType(file.type, allowedMimeTypes);
    if (!mimeValidation.valid) {
      return { valid: false, error: mimeValidation.error };
    }
  }

  // Valider extension
  if (allowedExtensions) {
    const extValidation = validateFileExtension(file.name, allowedExtensions);
    if (!extValidation.valid) {
      return { valid: false, error: extValidation.error };
    }
  }

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

  return {
    valid: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

/**
 * Valider image fil
 */
export function validateImageFile(file: File): FileValidationResult {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE.IMAGE,
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGE,
    allowedExtensions: ALLOWED_EXTENSIONS.IMAGE,
  });
}

/**
 * Valider document fil
 */
export function validateDocumentFile(file: File): FileValidationResult {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE.DOCUMENT,
    allowedMimeTypes: ALLOWED_MIME_TYPES.DOCUMENT,
    allowedExtensions: ALLOWED_EXTENSIONS.DOCUMENT,
  });
}

/**
 * Valider video fil
 */
export function validateVideoFile(file: File): FileValidationResult {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE.VIDEO,
    allowedMimeTypes: ALLOWED_MIME_TYPES.VIDEO,
    allowedExtensions: ALLOWED_EXTENSIONS.VIDEO,
  });
}

/**
 * Sanitize filnavn for lagring
 */
export function sanitizeFileName(filename: string): string {
  // Fjern extension
  const extension = filename.substring(filename.lastIndexOf("."));
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));

  // Erstatt mellomrom og spesialtegn med bindestrek
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""); // Fjern bindestrek i start/slutt

  return `${sanitized}${extension}`;
}

/**
 * Generer unikt filnavn med timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const sanitized = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = sanitized.substring(sanitized.lastIndexOf("."));
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf("."));
  
  return `${nameWithoutExt}-${timestamp}-${random}${extension}`;
}

