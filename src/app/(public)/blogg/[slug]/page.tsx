"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPostBySlug, getRelatedPosts } from "@/server/actions/blog.actions";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { TableOfContents } from "@/components/blog/table-of-contents";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    async function loadPost() {
      const result = await getPostBySlug(slug);
      
      if (!result.success || !result.data) {
        setNotFoundError(true);
        setLoading(false);
        return;
      }

      setPost(result.data);
      
      const relatedResult = await getRelatedPosts(slug);
      if (relatedResult.success) {
        setRelatedPosts(relatedResult.data);
      }
      
      setLoading(false);
    }
    
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Laster artikkel...</p>
        </section>
      </div>
    );
  }

  if (notFoundError || !post) {
    notFound();
  }

  const readingTime = Math.ceil(post.content.split(" ").length / 200);

  return (
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
              style={
                post.category.color
                  ? {
                      borderColor: post.category.color,
                      color: post.category.color,
                    }
                  : undefined
              }
            >
              {post.category.name}
            </Badge>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>

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
              {format(new Date(post.publishedAt), "d. MMMM yyyy", { locale: nb })}
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
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            {/* Main content */}
            <div className="min-w-0">
              <Card>
                <CardContent className="p-8 md:p-12">
                  <article
                    className="prose prose-lg prose-slate max-w-none
                      prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20
                      prose-h1:text-4xl prose-h1:mt-0 prose-h1:mb-6
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
                  {post.keywords.split(",").map((keyword: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Table of Contents - Sticky sidebar */}
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
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {related.excerpt}
                      </p>
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

