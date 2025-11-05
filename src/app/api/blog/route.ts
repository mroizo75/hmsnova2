import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Lazy load db to avoid build-time evaluation
    const { db } = await import("@/lib/db");
    
    if (!db?.blogPost) {
      return NextResponse.json([]);
    }

    const posts = await db.blogPost.findMany({
      where: {
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
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    return NextResponse.json(
      posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        publishedAt: post.publishedAt?.toISOString() || new Date().toISOString(),
        category: post.category,
        author: {
          name: "HMS Nova",
        },
        viewCount: post.viewCount,
      }))
    );
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json([]);
  }
}

