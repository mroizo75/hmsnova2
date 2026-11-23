import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import Link from "next/link";

interface Testimonial {
  id: number;
  author: string;
  role: string;
  company: string;
  rating: number;
  quote: string;
  highlight: string;
}

// Top testimonials - PLACEHOLDER - Erstatt med ekte kundeomtaler!
const FEATURED_TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    author: "Fornøyd kunde",
    role: "Daglig leder",
    company: "Norsk bedrift",
    rating: 5,
    quote: "HMS Nova har gjort HMS-arbeidet vårt mye enklere. Godt system.",
    highlight: "Enkelt å bruke",
  },
  {
    id: 2,
    author: "Fornøyd kunde",
    role: "HMS-ansvarlig",
    company: "Norsk bedrift",
    rating: 5,
    quote: "Bra funksjonalitet og god support. Anbefales!",
    highlight: "God support",
  },
  {
    id: 3,
    author: "Fornøyd kunde",
    role: "Eier",
    company: "Norsk bedrift",
    rating: 5,
    quote: "Fint system til en god pris. Vi er fornøyde.",
    highlight: "God verdi",
  },
];

interface TestimonialsSectionProps {
  title?: string;
  description?: string;
  showLink?: boolean;
}

export function TestimonialsSection({
  title = "Hva kundene våre sier",
  description = "Norske bedrifter som bruker HMS Nova",
  showLink = true,
}: TestimonialsSectionProps) {
  return (
    <section className="container mx-auto px-4 py-20 bg-muted/30">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          {description}
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className="h-6 w-6 fill-yellow-400 text-yellow-400" 
            />
          ))}
          <span className="ml-2 font-semibold">4.8/5</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Basert på omtaler fra fornøyde kunder
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {FEATURED_TESTIMONIALS.map((testimonial) => (
          <Card 
            key={testimonial.id} 
            className="hover:shadow-lg transition-shadow"
          >
            <CardContent className="pt-6">
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className="h-4 w-4 fill-yellow-400 text-yellow-400" 
                  />
                ))}
              </div>

              {/* Quote */}
              <div className="relative mb-4">
                <Quote className="absolute -top-1 -left-1 h-6 w-6 text-primary/20" />
                <p className="text-sm italic pl-5">
                  "{testimonial.quote}"
                </p>
              </div>

              {/* Highlight Badge */}
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4">
                {testimonial.highlight}
              </div>

              {/* Author */}
              <div className="border-t pt-4 mt-4">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.company}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showLink && (
        <div className="text-center mt-12">
          <Link 
            href="/team" 
            className="text-primary hover:underline font-semibold"
          >
            Les alle kundeomtaler →
          </Link>
        </div>
      )}
    </section>
  );
}
