"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPublishedPosts } from "@/server/actions/blog.actions";

export default function BloggPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      const result = await getPublishedPosts();
      if (result.success) {
        setPosts(result.data);
      }
      setLoading(false);
    }
    loadPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Laster artikler...</p>
        </section>
      </div>
    );
  }

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          📚 HMS Kunnskap
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold mb-6">HMS Nova Blogg</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Praktiske artikler om HMS, arbeidsmiljø og sikkerhet. Vi deler kunnskap
          som bygger trygghet i norske bedrifter.
        </p>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="container mx-auto px-4 py-12">
          <Link href={`/blogg/${featuredPost.slug}`}>
            <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
              <div className="grid md:grid-cols-2 gap-6">
                {featuredPost.coverImage && (
                  <div className="relative h-[300px] md:h-auto">
                    <img
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <CardContent className="p-8 flex flex-col justify-center">
                  <Badge variant="default" className="w-fit mb-4">
                    Fremhevet artikkel
                  </Badge>
                  {featuredPost.category && (
                    <Badge
                      variant="outline"
                      className="w-fit mb-4"
                      style={
                        featuredPost.category.color
                          ? {
                              borderColor: featuredPost.category.color,
                              color: featuredPost.category.color,
                            }
                          : undefined
                      }
                    >
                      {featuredPost.category.name}
                    </Badge>
                  )}
                  <h2 className="text-3xl font-bold mb-4">{featuredPost.title}</h2>
                  <p className="text-muted-foreground mb-6">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(featuredPost.publishedAt), "d. MMMM yyyy", {
                        locale: nb,
                      })}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularPosts.length === 0 && !featuredPost ? (
            <div className="col-span-full text-center py-20">
              <h3 className="text-2xl font-bold mb-4">Ingen artikler ennå</h3>
              <p className="text-muted-foreground">
                Kom tilbake snart for HMS-artikler og praktiske tips!
              </p>
            </div>
          ) : (
            regularPosts.map((post) => (
              <Link key={post.id} href={`/blogg/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {post.coverImage && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <CardHeader>
                    {post.category && (
                      <Badge
                        variant="outline"
                        className="w-fit mb-2"
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
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.publishedAt), "d. MMM yyyy", {
                          locale: nb,
                        })}
                      </div>
                    </div>
                    {post.keywords && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.keywords.split(",").slice(0, 3).map((keyword: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

