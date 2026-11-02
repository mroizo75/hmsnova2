import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { ShareButtons } from "@/components/blog/share-buttons";
import { SITE_CONFIG } from "@/lib/seo-config";
import { fetchPublishedPost, fetchRelatedPosts } from "@/server/queries/blog.queries";

export const revalidate = 3600;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPublishedPost(slug);
  if (!post) notFound();

  const relatedPosts = await fetchRelatedPosts(slug, post.categoryId);
  const readingTime = Math.ceil(post.content.split(/\s+/).length / 200);
  const url = `${SITE_CONFIG.url}/blogg/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: "nb-NO",
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "HMS Nova", url: SITE_CONFIG.url },
    publisher: {
      "@type": "Organization",
      name: "HMS Nova",
      url: SITE_CONFIG.url,
    },
    image: post.coverImage ? [post.coverImage] : undefined,
    articleSection: post.category?.name,
  };

  return (
    <article className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
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
              style={
                post.category.color
                  ? { borderColor: post.category.color, color: post.category.color }
                  : undefined
              }
            >
              {post.category.name}
            </Badge>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>
          <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              {post.authorImage && (
                <img
                  src={post.authorImage}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span>{post.authorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(post.publishedAt), "d. MMMM yyyy", { locale: nb })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} min lesing
            </div>
          </div>

          <ShareButtons url={url} title={post.title} className="mb-8" />

          {post.coverImage && (
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden mb-8">
              <img src={post.coverImage} alt={post.title} className="object-cover w-full h-full" />
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <div className="min-w-0">
              <Card>
                <CardContent className="p-8 md:p-12">
                  <div
                    className="prose prose-lg prose-slate max-w-none
                      prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20
                      prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4
                      prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
                      prose-p:text-foreground prose-p:leading-relaxed prose-p:my-4
                      prose-a:text-primary hover:prose-a:underline
                      prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                      prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                      prose-li:my-2 prose-li:text-foreground
                      prose-img:rounded-lg prose-img:shadow-md prose-img:my-8
                      prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-muted prose-pre:border"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                  />
                </CardContent>
              </Card>

              {post.keywords && (
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Nøkkelord:</span>
                  {post.keywords.split(",").map((keyword) => (
                    <Badge key={keyword.trim()} variant="secondary">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t">
                <ShareButtons url={url} title={post.title} />
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <Card className="p-6">
                  <TableOfContents />
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Relaterte artikler</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/blogg/${related.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {related.coverImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={related.coverImage}
                          alt={related.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h3 className="font-bold mb-2 line-clamp-2">{related.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{related.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
