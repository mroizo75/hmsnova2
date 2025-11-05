import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/lib/seo-config";

// Tving route til å være dynamisk (ikke pre-rendret under bygging)
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/**
 * RSS Feed for HMS Nova blogg
 * Tilgjengelig på /blogg/rss.xml
 */
export async function GET() {
  try {
    // Lazy load db to avoid build-time evaluation
    const { db } = await import("@/lib/db");

    // Sjekk at database er tilgjengelig
    if (!db || !db.blogPost) {
      return new NextResponse("RSS feed temporarily unavailable", { 
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "3600",
        }
      });
    }

    const posts = await db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 50, // Siste 50 artikler
    });

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HMS Nova Blogg</title>
    <link>${SITE_CONFIG.url}/blogg</link>
    <description>HMS-artikler og praktiske tips om arbeidsmiljø og sikkerhet. HMS Nova bygger trygghet.</description>
    <language>nb-NO</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_CONFIG.url}/blogg/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_CONFIG.url}/logo.png</url>
      <title>HMS Nova</title>
      <link>${SITE_CONFIG.url}</link>
    </image>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_CONFIG.url}/blogg/${post.slug}</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/blogg/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.publishedAt!).toUTCString()}</pubDate>
      <author>${post.author.email || SITE_CONFIG.contactEmail} (${post.author.name})</author>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("RSS feed error:", error);
    return new NextResponse("Error generating RSS feed", { status: 500 });
  }
}

