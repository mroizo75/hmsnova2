import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, BookOpen, Users, Linkedin, Mail, Phone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTeamMember } from "@/lib/team";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = getTeamMember(slug);

  if (!author) {
    return {
      title: "Forfatter ikke funnet",
    };
  }

  return {
    title: `${author.name} - ${author.title} | HMS Nova`,
    description: author.bio,
    openGraph: {
      title: `${author.name} - ${author.title}`,
      description: author.bio,
      type: "profile",
      images: [
        {
          url: author.image || "/opengraph-image",
          width: 400,
          height: 400,
          alt: author.name,
        }
      ],
    },
  };
}

export default async function AuthorPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = getTeamMember(slug);

  if (!author) {
    notFound();
  }

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    worksFor: {
      "@type": "Organization",
      name: "HMS Nova",
      url: "https://hmsnova.no"
    },
    knowsAbout: author.expertise,
    email: author.contact.email,
    telephone: author.contact.phone,
    sameAs: [author.contact.linkedin].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 mb-12">
              <div className="flex-shrink-0">
                <div className="w-48 h-48 rounded-full bg-muted overflow-hidden relative">
                  <Image
                    src={author.image}
                    alt={author.name}
                    fill
                    className="object-cover"
                    style={{ objectPosition: author.imagePosition ?? "top" }}
                    priority
                  />
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{author.name}</h1>
                <p className="text-xl text-muted-foreground mb-6">{author.title}</p>
                <p className="text-lg mb-6">{author.bio}</p>

                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-semibold">HMS Nova</span>
                    <span className="text-muted-foreground">{author.teamLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Moderne</span>
                    <span className="text-muted-foreground">HMS-løsninger</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <a href={`mailto:${author.contact.email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Send e-post
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`tel:${author.contact.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Ring meg
                    </a>
                  </Button>
                  {author.contact.linkedin && (
                    <Button asChild variant="outline">
                      <a
                        href={author.contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin className="mr-2 h-4 w-4" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Om {author.name.split(" ")[0]}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-lg max-w-none">
                {author.longBio.trim().split("\n\n").map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Kvalifikasjoner og erfaring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {author.credentials.map((cred, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-lg">{cred}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ekspertiseområder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {author.expertise.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-4 py-2">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="mt-12 flex flex-wrap gap-4 justify-center">
              <Button asChild size="sm" variant="outline">
                <Link href="/team">Tilbake til teamet</Link>
              </Button>
            </div>

            <div className="mt-12 text-center">
              <Card className="bg-primary text-primary-foreground border-0">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">
                    Trenger din bedrift HMS-hjelp?
                  </h2>
                  <p className="mb-6 text-primary-foreground/90">
                    Kontakt {author.name.split(" ")[0]} for en uforpliktende samtale om
                    hvordan HMS Nova kan hjelpe din bedrift.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                      <Link href="/registrer-bedrift">Registrer bedrift</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      className="bg-transparent border-2 border-white text-white hover:bg-white/10"
                    >
                      <a href={`mailto:${author.contact.email}`}>Send e-post</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
