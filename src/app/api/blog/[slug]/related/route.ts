import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!db || !db.blogPost) {
      return NextResponse.json([]);
    }

    const currentPost = await db.blogPost.findUnique({
      where: { slug },
      select: {
        id: true,
        categoryId: true,
      },
    });

    if (!currentPost) {
      return NextResponse.json([]);
    }

    const relatedPosts = await db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        id: {
          not: currentPost.id,
        },
        categoryId: currentPost.categoryId,
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            color: true,
          },
        },
        tags: {
          select: {
            name: true,
            slug: true,
          },
        },
        author: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 3,
    });

    return NextResponse.json(
      relatedPosts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        keywords: post.keywords,
        publishedAt: post.publishedAt?.toISOString() || new Date().toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        viewCount: post.viewCount,
        category: post.category,
        tags: post.tags,
        author: {
          name: "HMS Nova",
          image: "/logo-nova.png",
        },
      }))
    );
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return NextResponse.json([]);
  }
}

