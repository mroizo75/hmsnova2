"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Server Actions for Blog
 * Kjører KUN på server ved runtime, aldri under build
 */

// Hent alle publiserte blogger (for public side)
export async function getPublishedPosts() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: { select: { name: true, slug: true, color: true } },
        author: { select: { name: true, image: true } },
      },
      orderBy: { publishedAt: "desc" },
    });

    return {
      success: true,
      data: posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        publishedAt: post.publishedAt?.toISOString() || new Date().toISOString(),
        category: post.category,
        author: { name: "HMS Nova", image: post.author.image },
        viewCount: post.viewCount,
        keywords: post.keywords,
      })),
    };
  } catch (error) {
    console.error("Error fetching published posts:", error);
    return { success: false, error: "Kunne ikke hente artikler", data: [] };
  }
}

// Hent enkelt bloggpost (for public side)
export async function getPostBySlug(slug: string) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        category: { select: { name: true, slug: true, color: true } },
        tags: { select: { name: true, slug: true } },
        author: { select: { name: true, image: true } },
      },
    });

    if (!post) {
      return { success: false, error: "Artikkel ikke funnet", data: null };
    }

    // Inkrementer visninger
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        publishedAt: post.publishedAt?.toISOString() || new Date().toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        viewCount: post.viewCount + 1,
        category: post.category,
        tags: post.tags,
        keywords: post.keywords,
        author: { name: "HMS Nova", image: post.author.image },
      },
    };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { success: false, error: "Kunne ikke hente artikkel", data: null };
  }
}

// Hent relaterte poster
export async function getRelatedPosts(slug: string, limit = 3) {
  try {
    const currentPost = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, categoryId: true },
    });

    if (!currentPost) return { success: true, data: [] };

    const posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: currentPost.id },
        categoryId: currentPost.categoryId,
      },
      include: {
        category: { select: { name: true, slug: true, color: true } },
        author: { select: { name: true, image: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });

    return {
      success: true,
      data: posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        category: post.category,
      })),
    };
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return { success: true, data: [] };
  }
}

// SUPERADMIN: Hent alle poster (inkludert drafts)
export async function getAllPostsAdmin() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert", data: [] };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang", data: [] };
    }

    const posts = await prisma.blogPost.findMany({
      include: {
        category: { select: { name: true, slug: true } },
        author: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: posts };
  } catch (error) {
    console.error("Error fetching admin posts:", error);
    return { success: false, error: "Kunne ikke hente artikler", data: [] };
  }
}

// SUPERADMIN: Opprett/oppdater bloggpost
export async function upsertBlogPost(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang" };
    }

    const postData = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage,
      keywords: data.keywords || null,
      status: data.status,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      categoryId: data.categoryId,
      authorId: user.id,
    };

    const post = data.id
      ? await prisma.blogPost.update({ where: { id: data.id }, data: postData })
      : await prisma.blogPost.create({ data: postData });

    revalidatePath("/blogg");
    revalidatePath(`/blogg/${post.slug}`);

    return { success: true, data: post };
  } catch (error: any) {
    console.error("Error upserting post:", error);
    return { success: false, error: error.message || "Kunne ikke lagre artikkel" };
  }
}

// SUPERADMIN: Slett bloggpost
export async function deleteBlogPost(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang" };
    }

    await prisma.blogPost.delete({ where: { id } });
    revalidatePath("/blogg");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return { success: false, error: error.message || "Kunne ikke slette artikkel" };
  }
}

