import { z } from "zod";

/**
 * SIKKERHET: Common Validation Schemas
 * 
 * Gjenbrukbare validation schemas for hele applikasjonen.
 */

// ID validation (CUID format)
export const cuidSchema = z
  .string()
  .min(20, "Ugyldig ID")
  .max(30, "Ugyldig ID")
  .regex(/^c[a-z0-9]+$/, "Ugyldig ID format");

// UUID validation
export const uuidSchema = z
  .string()
  .uuid("Ugyldig UUID");

// Date validation
export const dateSchema = z
  .string()
  .or(z.date())
  .pipe(z.coerce.date());

// URL validation
export const urlSchema = z
  .string()
  .url("Ugyldig URL")
  .max(2048, "URL er for lang");

// File path validation (relative, no traversal)
export const filePathSchema = z
  .string()
  .min(1, "Filbane er påkrevd")
  .max(500, "Filbane er for lang")
  .regex(/^[^.\/][a-zA-Z0-9\/_\-\.]+$/, "Ugyldig filbane")
  .refine((path) => !path.includes(".."), {
    message: "Filbanen kan ikke inneholde '..' (directory traversal)",
  });

// Text content (short)
export const textSchema = z
  .string()
  .min(1, "Tekst er påkrevd")
  .max(500, "Teksten er for lang")
  .trim();

// Text content (long)
export const longTextSchema = z
  .string()
  .min(1, "Tekst er påkrevd")
  .max(10000, "Teksten er for lang")
  .trim();

// HTML content (sanitized)
export const htmlSchema = z
  .string()
  .min(1, "Innhold er påkrevd")
  .max(100000, "Innholdet er for langt");

// Slug validation
export const slugSchema = z
  .string()
  .min(1, "Slug er påkrevd")
  .max(200, "Slug er for lang")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug kan bare inneholde små bokstaver, tall og bindestrek")
  .toLowerCase();

// Tag validation
export const tagSchema = z
  .string()
  .min(1, "Tag er påkrevd")
  .max(50, "Tag er for lang")
  .trim()
  .toLowerCase();

// Color validation (hex)
export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Ugyldig fargekode (må være hex format, f.eks. #FF0000)")
  .optional();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Sort options
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Search query
export const searchSchema = z.object({
  q: z.string().min(1).max(200).trim().optional(),
});

// Boolean from string
export const booleanSchema = z
  .string()
  .transform((val) => val === "true" || val === "1")
  .or(z.boolean());

// Number from string
export const numberSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .or(z.number());

// CSV string to array
export const csvToArraySchema = z
  .string()
  .transform((val) => val.split(",").map((v) => v.trim()).filter(Boolean))
  .or(z.array(z.string()));

/**
 * IP Address validation
 */
export const ipAddressSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    "Ugyldig IP-adresse"
  )
  .or(
    z
      .string()
      .regex(
        /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        "Ugyldig IPv6-adresse"
      )
  );

/**
 * JSON validation
 */
export const jsonSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ugyldig JSON",
      });
      return z.NEVER;
    }
  });

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

