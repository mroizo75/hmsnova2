import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Quote, Building2, MapPin } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kundeomtaler - Hva kundene våre sier | HMS Nova",
  description: "Les hva norske bedrifter sier om HMS Nova. Se hvordan HMS Nova bygger trygghet i bedrifter over hele Norge.",
  keywords: "hms nova anmeldelser, hms system omtaler, kundeomtaler hms, beste hms system norge",
  openGraph: {
    title: "Kundeomtaler - HMS Nova",
    description: "Se hva kundene våre sier om HMS Nova",
  },
};

// Testimonials data - PLACEHOLDER - Erstatt med ekte kundeomtaler!
// TODO: Samle ekte omtaler fra fornøyde kunder
const TESTIMONIALS = [
  {
    id: 1,
    author: "Fornøyd kunde",
    role: "Daglig leder",
    company: "Norsk bedrift",
    location: "Norge",
    industry: "Bygg og anlegg",
    rating: 5,
    date: "2025-01-01",
    quote: "HMS Nova har gjort HMS-arbeidet vårt mye enklere. Godt system som dekker våre behov.",
    highlight: "Enkelt å bruke",
    beforeAfter: "Digitalt HMS",
  },
  {
    id: 2,
    author: "Fornøyd kunde",
    role: "HMS-ansvarlig",
    company: "Norsk bedrift",
    location: "Norge",
    industry: "Service",
    rating: 5,
    date: "2025-01-01",
    quote: "Bra system med god funksjonalitet. Anbefales!",
    highlight: "God funksjonalitet",
    beforeAfter: "Moderne løsning",
  },
  {
    id: 3,
    author: "Fornøyd kunde",
    role: "Eier",
    company: "Norsk bedrift",
    location: "Norge",
    industry: "Håndverk",
    rating: 5,
    date: "2025-01-01",
    quote: "Fint system til en god pris. Vi er fornøyde.",
    highlight: "God pris",
    beforeAfter: "Rimelig alternativ",
  },
];

// Calculate aggregate rating
const totalRating = TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0);
const avgRating = (totalRating / TESTIMONIALS.length).toFixed(1);
const reviewCount = TESTIMONIALS.length;

// AggregateRating Schema
const aggregateRatingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "HMS Nova",
  description: "Norges mest moderne HMS-system",
  image: "https://hmsnova.no/logo-nova.png",
  brand: {
    "@type": "Brand",
    name: "HMS Nova"
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: avgRating,
    reviewCount: reviewCount,
    bestRating: "5",
    worstRating: "1"
  },
  review: TESTIMONIALS.map(t => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: t.author,
      jobTitle: t.role
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: t.rating.toString(),
      bestRating: "5",
      worstRating: "1"
    },
    reviewBody: t.quote,
    datePublished: t.date,
    publisher: {
      "@type": "Organization",
      name: t.company
    }
  }))
};

export default function AnmeldelserPage() {
  return (
    <>
      {/* Schema.org Review markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingSchema) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Badge className="mb-4" variant="secondary">
            Kundeomtaler
          </Badge>
          <h1 className="text-5xl font-bold mb-6">
            Hva kundene våre sier
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Les hvordan HMS Nova bygger trygghet i norske bedrifter.
          </p>

          {/* Aggregate Rating */}
          <div className="flex items-center justify-center gap-6 mb-12">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">
                {avgRating}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-6 w-6 ${
                      i < Math.round(Number(avgRating)) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-muted-foreground/30'
                    }`} 
                  />
                ))}
              </div>
              <p className="text-muted-foreground">
                {reviewCount} omtaler
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="container mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${
                          i < testimonial.rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground/30'
                        }`} 
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {new Date(testimonial.date).toLocaleDateString('nb-NO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>

                  {/* Quote */}
                  <div className="relative mb-6">
                    <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/20" />
                    <p className="text-lg pl-6 italic">
                      "{testimonial.quote}"
                    </p>
                  </div>

                  {/* Highlight */}
                  <Badge variant="secondary" className="mb-4">
                    {testimonial.highlight}
                  </Badge>

                  {/* Author */}
                  <div className="border-t pt-4 mt-4">
                    <p className="font-semibold text-lg">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{testimonial.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{testimonial.location} · {testimonial.industry}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      {/* Om grunnleggeren */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Om HMS Nova
          </h2>
          <p className="text-muted-foreground mb-6">
            HMS Nova er grunnlagt og utviklet av Kenneth Kristiansen, 
            som brenner for å gjøre HMS-arbeid enkelt og tilgjengelig for alle bedrifter.
          </p>
          <Link 
            href="/forfatter/kenneth-kristiansen" 
            className="text-primary hover:underline font-semibold"
          >
            Les mer om grunnleggeren →
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pb-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Bli en av våre fornøyde kunder
              </h2>
              <p className="text-lg mb-8 text-primary-foreground/90">
                Registrer bedrift. 14 dagers angrefrist, deretter 12 måneders binding.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/registrer-bedrift">
                    Registrer bedrift
                  </Link>
                </Button>
                <Button 
                  asChild 
                  size="lg" 
                  variant="outline" 
                  className="border-primary-foreground/20 hover:bg-primary-foreground/10"
                >
                  <Link href="/priser">
                    Se priser
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
