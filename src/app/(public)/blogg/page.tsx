import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getCanonicalUrl, ROBOTS_CONFIG } from "@/lib/seo-config";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HMS-blogg - Artikler om Arbeidsmiljø og Sikkerhet | HMS Nova",
  description: "Les våre ekspertartikler om HMS, arbeidsmiljø, ISO 9001, risikovurdering og mer. Praktiske tips og råd fra HMS Nova - vi bygger trygghet.",
  keywords: "HMS blogg, arbeidsmiljø artikler, HMS tips, ISO 9001 guide, risikovurdering guide, vernerunde tips",
  alternates: {
    canonical: getCanonicalUrl("/blogg"),
    types: {
      "application/rss+xml": [{ url: "/blogg/rss.xml", title: "HMS Nova Blogg RSS" }],
    },
  },
  robots: ROBOTS_CONFIG,
  openGraph: {
    title: "HMS-blogg - Praktiske HMS-artikler | HMS Nova",
    description: "Ekspertartikler om HMS, arbeidsmiljø og sikkerhet. HMS Nova bygger trygghet.",
    url: getCanonicalUrl("/blogg"),
    type: "website",
  },
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string;
  category: {
    name: string;
    slug: string;
    color: string | null;
  } | null;
  author: {
    name: string;
  };
  viewCount: number;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/blog`, {
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
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

export default async function BloggPage() {
  const posts = await getBlogPosts();
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          📚 HMS Kunnskap
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          HMS Nova Blogg
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Praktiske artikler om HMS, arbeidsmiljø og sikkerhet. 
          Vi deler kunnskap som bygger trygghet i norske bedrifter.
        </p>
        
        <div className="max-w-md mx-auto">
          <Input
            placeholder="Søk artikler..."
            className="h-12"
          />
        </div>
      </section>

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
                      style={featuredPost.category.color ? {
                        borderColor: featuredPost.category.color,
                        color: featuredPost.category.color,
                      } : undefined}
                    >
                      {featuredPost.category.name}
                    </Badge>
                  )}
                  <h2 className="text-3xl font-bold mb-4">
                    {featuredPost.title}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(featuredPost.publishedAt), "d. MMMM yyyy", {
                        locale: nb,
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      5 min lesing
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        </section>
      )}

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
                        style={post.category.color ? {
                          borderColor: post.category.color,
                          color: post.category.color,
                        } : undefined}
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.publishedAt), "d. MMM yyyy", {
                          locale: nb,
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Vil du ha HMS Nova i din bedrift?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Få Norges mest moderne HMS-system. Prøv gratis i 14 dager.
            </p>
            <Link href="/gratis-hms-system">
              <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors">
                Kom i gang nå
                <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
