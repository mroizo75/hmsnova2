import { prisma } from "@/lib/db";

/**
 * Offentlig blogglasting uten skriving.
 * Visningstall økes ikke her. Crawlere som Google og AI-søk skal kunne lese
 * HTML uten å treffe en skrivetransaksjon som kan feile.
 */

const postListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  publishedAt: true,
  keywords: true,
  category: { select: { name: true, slug: true, color: true } },
} as const;

export async function fetchPublishedPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: postListSelect,
    orderBy: { publishedAt: "desc" },
  });

  return posts.map((post) => ({
    ...post,
    publishedAt: post.publishedAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function fetchPublishedPost(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: { select: { name: true, slug: true, color: true } },
      tags: { select: { name: true, slug: true } },
      author: { select: { name: true, image: true } },
    },
  });

  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    keywords: post.keywords,
    category: post.category,
    categoryId: post.categoryId,
    tags: post.tags,
    authorName: post.author.name || "HMS Nova",
    authorImage: post.author.image,
  };
}

export async function fetchRelatedPosts(slug: string, categoryId: string | null, limit = 3) {
  if (!categoryId) return [];

  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: slug },
      categoryId,
    },
    select: postListSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return posts.map((post) => ({
    ...post,
    publishedAt: post.publishedAt?.toISOString() ?? new Date().toISOString(),
  }));
}
