import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getCanonicalUrl, ROBOTS_CONFIG, getBreadcrumbSchema, SITE_CONFIG } from "@/lib/seo-config";
import { sanitizeHtml } from "@/lib/sanitize-html";
import Script from "next/script";
import { TableOfContents } from "@/components/blog/table-of-contents";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [] as Array<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "HMS-artikkel | HMS Nova",
  description: "Les våre ekspertartikler om HMS, arbeidsmiljø og sikkerhet. Praktiske tips og råd fra HMS Nova - vi bygger trygghet.",
  keywords: "HMS, arbeidsmiljø, sikkerhet, ISO 9001, risikovurering",
  robots: ROBOTS_CONFIG,
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  publishedAt: string;
  updatedAt: string;
  viewCount: number;
  category: {
    name: string;
    slug: string;
    color: string | null;
  } | null;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  author: {
    name: string;
    image: string | null;
  };
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    // Use internal URL during build, external URL at runtime
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? SITE_CONFIG.url : '';
    
    const res = await fetch(`${baseUrl}/api/blog/${slug}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

async function getRelatedPosts(slug: string): Promise<BlogPost[]> {
  try {
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? SITE_CONFIG.url : '';
    
    const res = await fetch(`${baseUrl}/api/blog/${slug}/related`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug);
  const readingTime = Math.ceil(post.content.split(" ").length / 200);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "HMS Nova",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/logo-nova.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/blogg/${post.slug}`),
    },
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Hjem", url: "/" },
    { name: "Blogg", url: "/blogg" },
    { name: post.title, url: `/blogg/${post.slug}` },
  ]);

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
        strategy="afterInteractive"
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
        strategy="afterInteractive"
      />

      <article className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Link href="/blogg">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til blogg
              </Button>
            </Link>

            {post.category && (
              <Badge
                variant="outline"
                className="mb-4"
                style={post.category.color ? {
                  borderColor: post.category.color,
                  color: post.category.color,
                } : undefined}
              >
                {post.category.name}
              </Badge>
            )}

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                {post.author.image && (
                  <img
                    src={post.author.image}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span>{post.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.publishedAt), "d. MMMM yyyy", {
                  locale: nb,
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {readingTime} min lesing
              </div>
            </div>

            {post.coverImage && (
              <div className="relative w-full h-[400px] rounded-xl overflow-hidden mb-8">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="flex items-center gap-4 mb-8 pb-8 border-b">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Del artikkel
              </Button>
              {post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((tag) => (
                    <Badge key={tag.slug} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <Card>
                  <CardContent className="p-8 md:p-12">
                    <div
                      className="prose prose-lg prose-slate max-w-none
                        prose-headings:font-bold prose-headings:text-foreground
                        prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-4
                        prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                        prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
                        prose-h4:text-xl prose-h4:mt-4 prose-h4:mb-2
                        prose-p:text-foreground prose-p:leading-relaxed prose-p:my-4
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                        prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                        prose-li:my-2 prose-li:text-foreground
                        prose-blockquote:border-l-4 prose-blockquote:border-primary 
                        prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded 
                        prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                        prose-img:rounded-lg prose-img:shadow-md prose-img:my-8
                        prose-hr:border-border prose-hr:my-8
                        prose-table:border-collapse prose-table:w-full prose-table:my-6
                        prose-thead:border-b-2 prose-thead:border-border
                        prose-th:text-left prose-th:p-3 prose-th:font-semibold
                        prose-td:p-3 prose-td:border-t prose-td:border-border"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                    />
                  </CardContent>
                </Card>
              </div>

              <aside className="lg:col-span-4 hidden lg:block">
                <TableOfContents />
              </aside>
            </div>
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="container mx-auto px-4 py-20">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Relaterte artikler</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/blogg/${relatedPost.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      {relatedPost.coverImage && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={relatedPost.coverImage}
                            alt={relatedPost.title}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <CardContent className="p-6">
                        <h3 className="font-bold mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {relatedPost.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                HMS Nova bygger trygghet
              </h2>
              <p className="text-lg mb-8 text-primary-foreground/90">
                Få Norges mest moderne HMS-system. Prøv gratis i 14 dager.
              </p>
              <Link href="/gratis-hms-system">
                <Button size="lg" variant="secondary">
                  Kom i gang nå
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </article>
    </>
  );
}
