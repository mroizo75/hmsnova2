import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Lazy load db to avoid build-time evaluation
    const { db } = await import("@/lib/db");

    if (!db?.blogPost) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const post = await db.blogPost.findUnique({
      where: {
        slug,
        status: "PUBLISHED",
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
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Increment view count
    try {
      await db.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    } catch (err) {
      console.error("Error updating view count:", err);
    }

    return NextResponse.json({
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
      viewCount: post.viewCount + 1,
      category: post.category,
      tags: post.tags,
      author: {
        name: "HMS Nova",
        image: "/logo-nova.png",
      },
    });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

