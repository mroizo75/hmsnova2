import { z } from "zod";
import {
  cuidSchema,
  textSchema,
  longTextSchema,
  htmlSchema,
  slugSchema,
  tagSchema,
  colorSchema,
  paginationSchema,
  sortSchema,
} from "./common";

/**
 * SIKKERHET: Blog Validation Schemas
 */

/**
 * Blog Category Schema
 */
export const blogCategorySchema = z.object({
  name: textSchema.max(100),
  slug: slugSchema,
  description: textSchema.max(500).optional(),
  color: colorSchema,
});

/**
 * Blog Tag Schema
 */
export const blogTagSchema = z.object({
  name: tagSchema,
});

/**
 * Blog Post Create Schema
 */
export const createBlogPostSchema = z.object({
  title: textSchema.max(200, "Tittelen er for lang"),
  slug: slugSchema,
  excerpt: textSchema.max(500).optional(),
  content: htmlSchema,
  featuredImage: z.string().url("Ugyldig bilde-URL").optional(),
  categoryId: cuidSchema,
  tags: z.array(z.string().min(1).max(50)).max(10, "Maksimalt 10 tags").optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().or(z.date()).pipe(z.coerce.date()).optional(),
  seoTitle: textSchema.max(60).optional(),
  seoDescription: textSchema.max(160).optional(),
  seoKeywords: z.array(z.string()).max(10).optional(),
});

/**
 * Blog Post Update Schema
 */
export const updateBlogPostSchema = createBlogPostSchema.partial();

/**
 * Blog Post Query Schema
 */
export const blogPostQuerySchema = z
  .object({
    published: z.enum(["true", "false"]).optional(),
    categoryId: cuidSchema.optional(),
    tag: z.string().optional(),
    search: z.string().min(1).max(200).optional(),
  })
  .merge(paginationSchema)
  .merge(sortSchema);

/**
 * Image Upload Schema
 */
export const imageUploadSchema = z.object({
  file: z.any(), // Will be validated separately with file type/size checks
  alt: textSchema.max(200).optional(),
});

/**
 * Delete Blog Post Schema
 */
export const deleteBlogPostSchema = z.object({
  id: cuidSchema,
  confirm: z.literal(true).refine((val) => val === true, {
    message: "Du må bekrefte slettingen",
  }),
});

// Type exports
export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;
export type BlogTagInput = z.infer<typeof blogTagSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type BlogPostQueryInput = z.infer<typeof blogPostQuerySchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type DeleteBlogPostInput = z.infer<typeof deleteBlogPostSchema>;

