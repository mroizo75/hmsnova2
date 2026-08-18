import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RegisterDialog } from "@/components/register-dialog";
import { TrustBadges } from "@/components/trust-badges";
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Flame,
  ListChecks,
  Target,
  FileText,
  Brain,
  Smartphone,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { BRANSJE_PUBLIC_DATA, MODULE_DESCRIPTIONS } from "@/lib/bransje-public-data";
import { BASE_SIMPLE_MODULES } from "@/lib/bransje-modules";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  getBreadcrumbSchema,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import { MultipleStructuredData } from "@/components/seo/structured-data";

export const metadata: Metadata = {
  title: "HMS-system for alle bransjer | HMS Nova",
  description: "HMS Nova er tilpasset 16 bransjer med bransjespesifikke moduler, maler og lovkrav. Bygg og anlegg, helse, hotell, transport, industri og flere. Fra 300 kr/mnd.",
  keywords: "hms system bransjer, hms bygg, hms helse, hms restaurant, hms transport, hms industri, hms kontor, bransjetilpasset hms",
  alternates: { canonical: getCanonicalUrl("/bransjer") },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults("HMS-system for alle bransjer | HMS Nova", "HMS Nova er tilpasset 16 bransjer med bransjespesifikke moduler, maler og lovkrav.", "/bransjer"),
  twitter: getTwitterDefaults("HMS-system for alle bransjer | HMS Nova", "HMS Nova er tilpasset 16 bransjer med bransjespesifikke moduler, maler og lovkrav."),
};

const BASE_MODULE_ICONS: Record<string, any> = {
  "/dashboard/hms-handbok": BookOpen,
  "/dashboard/incidents": AlertCircle,
  "/dashboard/risks": Target,
  "/dashboard/rutiner": FileText,
  "/dashboard/inspections": ShieldCheck,
  "/dashboard/training": GraduationCap,
  "/dashboard/fire-drills": Flame,
  "/dashboard/annual-hms-plan": ListChecks,
};

export default function BransjerPage() {
  const bransjer = BRANSJE_PUBLIC_DATA.filter((b) => b.key !== "other");
  const annenBransje = BRANSJE_PUBLIC_DATA.find((b) => b.key === "other");

  const baseModules = BASE_SIMPLE_MODULES
    .filter((path) => path !== "/dashboard" && path !== "/dashboard/settings")
    .map((path) => ({
      ...MODULE_DESCRIPTIONS[path],
      icon: BASE_MODULE_ICONS[path] ?? MODULE_DESCRIPTIONS[path]?.icon,
    }))
    .filter(Boolean);

  const structuredData = [
    getBreadcrumbSchema([
      { name: "Hjem", url: "/" },
      { name: "Bransjer", url: "/bransjer" },
    ]),
  ];

  return (
    <>
      <MultipleStructuredData dataArray={structuredData} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-16">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
                16 bransjer tilpasset
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
                HMS-system tilpasset din bransje
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                HMS Nova er ferdig konfigurert for din bransje med relevante moduler, maler og lovkrav.
                Velg bransje og se hvordan HMS Nova forenkler HMS-arbeidet for akkurat din virksomhet.
              </p>
              <TrustBadges variant="compact" />
            </div>
          </ScrollReveal>
        </section>

        {/* Bransjegrid */}
        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bransjer.map((bransje, i) => {
                const Icon = bransje.icon;
                return (
                  <ScrollReveal key={bransje.slug} delay={i * 40}>
                    <Link href={`/bransjer/${bransje.slug}`}>
                      <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30 hover:-translate-y-0.5 group">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="font-semibold text-sm group-hover:text-primary transition-colors">{bransje.label}</h2>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bransje.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </ScrollReveal>
                );
              })}
              {annenBransje && (
                <ScrollReveal delay={bransjer.length * 40}>
                  <Link href={`/bransjer/${annenBransje.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30 hover:-translate-y-0.5 group border-dashed">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                            <annenBransje.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-semibold text-sm group-hover:text-primary transition-colors">{annenBransje.label}</h2>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{annenBransje.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>

        {/* Fellesfunksjoner */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Kjernefunksjoner i alle bransjer
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Uansett bransje får du disse funksjonene som dekker grunnkravene i internkontrollforskriften og Arbeidsmiljøloven.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {baseModules.map((mod, i) => {
                  const ModIcon = mod.icon;
                  return (
                    <ScrollReveal key={mod.path} delay={i * 50}>
                      <Card className="h-full">
                        <CardContent className="p-5 text-center">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <ModIcon className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-sm mb-1">{mod.shortName ?? mod.name}</h3>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* AI-motor */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <Badge variant="secondary" className="mb-4">
                    <Brain className="h-3.5 w-3.5 mr-1.5" />
                    Intelligent HMS
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    HMS Nova lærer av dine data
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Vår intelligensmotor analyserer avvik, risikoer og hendelser på tvers av alle moduler
                    og foreslår konkrete forbedringer -- automatisk.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: TrendingUp, title: "Mønstergjenkjenning", description: "Systemet oppdager når flere avvik peker på samme rotårsak og foreslår endringer i rutiner eller HMS-håndbok." },
                  { icon: BookOpen, title: "Levende HMS-håndbok", description: "HMS-håndboken oppdateres når forbedringsforslag godkjennes. Alt versjonskontrolleres og signeres digitalt." },
                  { icon: BarChart3, title: "Rapporter for tilsyn", description: "Generer komplett endringslogg med alle forbedringer, godkjenninger og signeringer -- klar for Arbeidstilsynet." },
                ].map((f, i) => {
                  const FIcon = f.icon;
                  return (
                    <ScrollReveal key={i} delay={i * 100}>
                      <Card className="h-full text-center">
                        <CardContent className="p-6 pt-8">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <FIcon className="h-7 w-7 text-primary" />
                          </div>
                          <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Hvorfor HMS Nova */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4">Hvorfor HMS Nova?</h2>
                </div>
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: Smartphone, text: "Mobiloptimalisert -- fungerer i felten uten PC" },
                  { icon: Users, text: "Ubegrenset antall brukere, ingen ekstra kostnad" },
                  { icon: Brain, text: "AI-motor som lærer av dine data og foreslår forbedringer" },
                  { icon: BookOpen, text: "Levende HMS-håndbok med versjonskontroll og signering" },
                  { icon: CheckCircle2, text: "Bygd med norsk lov som utgangspunkt -- alltid oppdatert" },
                  { icon: BarChart3, text: "Rapporter klare for Arbeidstilsynet med ett klikk" },
                ].map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <ScrollReveal key={i} delay={i * 60}>
                      <div className="flex items-start gap-3 p-4">
                        <ItemIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <span className="text-[15px]">{item.text}</span>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <ScrollReveal>
            <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Klar for bedre HMS i din bransje?
                </h2>
                <p className="text-lg mb-8 text-primary-foreground/90 max-w-xl mx-auto">
                  HMS Nova er tilpasset din bransje og klar til bruk på 15 minutter.
                  Alt inkludert fra 300 kr/mnd med ubegrenset antall brukere.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <RegisterDialog>
                    <Button size="lg" variant="secondary" className="text-lg px-8">
                      Start gratis i 14 dager
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </RegisterDialog>
                  <Link href="/priser">
                    <Button size="lg" variant="ghost" className="text-lg px-8 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10">
                      Se priser
                    </Button>
                  </Link>
                </div>
                <p className="text-sm mt-6 text-primary-foreground/70">
                  14 dagers gratis test &middot; Ingen kredittkort &middot; Norsk support
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </section>
      </div>
    </>
  );
}
