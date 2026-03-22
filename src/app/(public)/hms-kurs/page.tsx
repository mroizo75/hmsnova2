"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  Heart,
  Shield,
  Users,
  Award,
  Calendar,
  FileText,
  Phone,
  Clock,
  Building2,
  TrendingDown,
  AlertCircle,
  Zap,
  BookOpen,
  Video,
  Laptop,
  HardHat,
  Activity,
  Baby,
  Loader2
} from "lucide-react";

export default function HMSKursPage() {
  const t = useTranslations("hmsCoursesPage");
  const locale = useLocale();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    orgNr: "",
    name: "",
    email: "",
    phone: "",
    courseType: "",
    participants: "",
    format: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/courses/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          participants: formData.participants ? parseInt(formData.participants) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("toasts.genericError"));
      }

      toast({
        title: data.isMember
          ? t("toasts.submitSuccess.memberTitle")
          : t("toasts.submitSuccess.defaultTitle"),
        description: data.isMember 
          ? t("toasts.submitSuccess.memberDescription", {
              amount: Number(data.discountAmount ?? 0).toLocaleString(locale === "en" ? "en-US" : "nb-NO"),
            })
          : t("toasts.submitSuccess.defaultDescription"),
      });

      // Reset form
      setFormData({
        company: "",
        orgNr: "",
        name: "",
        email: "",
        phone: "",
        courseType: "",
        participants: "",
        format: "",
        message: "",
      });

    } catch (error) {
      toast({
        title: t("toasts.submitError.title"),
        description: error instanceof Error ? error.message : t("toasts.submitError.description"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };
  const courses = [
    {
      category: "Lovpålagte kurs (Alle bransjer)",
      icon: Shield,
      color: "bg-red-50 border-red-200",
      iconColor: "text-red-600",
      items: [
        {
          title: "Grunnleggende HMS for ansatte og verneombud (40-timer)",
          format: "Fysisk / Nettbasert / Hybrid",
          target: "Ansatte, verneombud",
          reason: "Lovpålagt. Fra 2024 må bedrifter med 5+ ansatte ha verneombud",
          required: true,
        },
        {
          title: "Lovpålagt HMS-kurs for ledere (§3-5 AML)",
          format: "Fysisk / Nettbasert",
          target: "Ledere",
          reason: "Lovpålagt for alle arbeidsgivere",
          required: true,
        },
        {
          title: "Psykososialt arbeidsmiljø – alle nivåer",
          format: "Fysisk / Nettbasert / Interaktivt",
          target: "Alle nivåer",
          reason: "Ny forskrift skjerper krav til psykososialt arbeidsmiljø",
          required: true,
        },
      ],
    },
    {
      category: "Bygg og anlegg",
      icon: HardHat,
      color: "bg-orange-50 border-orange-200",
      iconColor: "text-orange-600",
      items: [
        {
          title: "Fallsikring og arbeid i høyden",
          format: "Fysisk (praktisk kurs)",
          target: "Ansatte",
          reason: "Fall er blant de vanligste skadekildene i bygg/anlegg",
        },
        {
          title: "Asbest og farlige materialer",
          format: "Fysisk / Nettbasert",
          target: "Ansatte, prosjektledere",
          reason: "Nye EU-regler for trygg håndtering og opplæring ved asbesteksponering",
        },
        {
          title: "Sikker bruk av diisocyanater",
          format: "Nettbasert med test (sertifisering)",
          target: "Ansatte",
          reason: "Pålagt opplæring fra EU fra 24. august 2023",
          required: true,
        },
      ],
    },
    {
      category: "Industri/Produksjon",
      icon: Building2,
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
      items: [
        {
          title: "Maskinsikkerhet og verneutstyr",
          format: "Fysisk (verkstedmiljø)",
          target: "Operatører, vedlikehold",
          reason: "Vanlige skader i industrien kommer av maskinbruk uten tilstrekkelig opplæring",
        },
        {
          title: "Kjemikaliehåndtering inkl. diisocyanater",
          format: "Fysisk / Nettbasert",
          target: "Produksjonsansatte",
          reason: "Påbudt for arbeid med helsefarlige kjemikalier, inkl. diisocyanater",
          required: true,
        },
      ],
    },
    {
      category: "Helse og omsorg",
      icon: Heart,
      color: "bg-pink-50 border-pink-200",
      iconColor: "text-pink-600",
      items: [
        {
          title: "Vold og trusler – forebygging og håndtering",
          format: "Fysisk / Hybrid",
          target: "Ansatte i helse, offentlig sektor",
          reason: "Økende tilfeller, skjerpede tilsynskrav",
        },
        {
          title: "Ergonomi og forflytningsteknikk",
          format: "Fysisk (praktisk trening)",
          target: "Ansatte i pleie og omsorg",
          reason: "Vanlige belastningsskader, viktig for sykefraværsreduksjon",
        },
      ],
    },
    {
      category: "Transport/Logistikk",
      icon: Activity,
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
      items: [
        {
          title: "Trafikksikkerhet og lastsikring for sjåfører",
          format: "Fysisk / Nettbasert (YSK-modul)",
          target: "Sjåfører",
          reason: "Mange alvorlige ulykker, nye krav til utstyr og førerstøtte",
        },
        {
          title: "Truck- og maskinførerkurs",
          format: "Fysisk (sertifisering)",
          target: "Lagerarbeidere, sjåfører",
          reason: "Nødvendig for trygt arbeid med truck og maskiner, påkrevd sertifisering",
          required: true,
        },
      ],
    },
    {
      category: "Utdanning/Offentlig sektor",
      icon: BookOpen,
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
      items: [
        {
          title: "Digital sikkerhet for offentlig ansatte",
          format: "Nettbasert (e-læring, simulering)",
          target: "Kontoransatte, saksbehandlere",
          reason: "Økende cybertrusler og skjerpede krav til GDPR-opplæring",
        },
        {
          title: "Inneklima og psykososialt miljø i skoler/barnehager",
          format: "Fysisk eller hybrid",
          target: "Lærere, barnehageansatte",
          reason: "Nye regler likestiller psykososialt og fysisk arbeidsmiljø",
        },
      ],
    },
  ];

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="default" className="mb-6">
              <GraduationCap className="h-3 w-3 mr-2" />
              {t("hero.badge")}
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t("hero.titleLine1")}<br />
              <span className="text-primary">{t("hero.titleLine2")}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              <strong>{t("hero.memberStrong")}</strong> {t("hero.memberTextPrefix")}{" "}
              <strong className="text-primary">{t("hero.discountStrong")}</strong> {t("hero.memberTextSuffix")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="#bestill-kurs">
                  <Award className="mr-2 h-5 w-5" />
                  {t("hero.ctaPrimary")}
                </Link>
              </Button>
              <Link href="#kursoversikt">
                <Button size="lg" variant="outline">
                  {t("hero.ctaSecondary")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              ✓ {t("hero.points.p1")}<br/>
              ✓ {t("hero.points.p2")}<br/>
              ✓ {t("hero.points.p3")}<br/>
              ✓ {t("hero.points.p4")}
            </p>
          </div>
          <div className="relative">
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{t("hero.specialist.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("hero.specialist.subtitle")}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Baby className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t("hero.specialist.items.children.title")}</p>
                      <p className="text-sm text-muted-foreground">{t("hero.specialist.items.children.description")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t("hero.specialist.items.adults.title")}</p>
                      <p className="text-sm text-muted-foreground">{t("hero.specialist.items.adults.description")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t("hero.specialist.items.certified.title")}</p>
                      <p className="text-sm text-muted-foreground">{t("hero.specialist.items.certified.description")}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold text-primary text-center">
                    {t("hero.specialist.footer")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              {t("problem.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("problem.description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">{t("problem.cards.law.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("problem.cards.law.textPrefix")} <strong>{t("problem.cards.law.textStrong")}</strong> {t("problem.cards.law.textSuffix")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <TrendingDown className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">{t("problem.cards.incidents.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("problem.cards.incidents.textPrefix")} <strong>{t("problem.cards.incidents.textStrong")}</strong> {t("problem.cards.incidents.textSuffix")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">{t("problem.cards.employees.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("problem.cards.employees.textPrefix")} <strong>{t("problem.cards.employees.textStrong")}</strong> {t("problem.cards.employees.textSuffix")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">{t("problem.cards.documentation.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("problem.cards.documentation.textPrefix")} <strong>{t("problem.cards.documentation.textStrong")}</strong> {t("problem.cards.documentation.textSuffix")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge variant="default" className="mb-4">
            {t("solution.badge")}
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            {t("solution.title")}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t("solution.textPrefix")} <strong>{t("solution.textStrong")}</strong> {t("solution.textSuffix")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{t("solution.steps.step1.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("solution.steps.step1.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{t("solution.steps.step2.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("solution.steps.step2.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{t("solution.steps.step3.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("solution.steps.step3.description")}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Kursoversikt */}
      <section id="kursoversikt" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("catalog.title")}</h2>
            <p className="text-muted-foreground">
              {t("catalog.description")}
            </p>
          </div>

          <div className="space-y-8">
            {courses.map((category, idx) => (
              <Card key={idx} className={category.color}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full bg-white flex items-center justify-center`}>
                      <category.icon className={`h-6 w-6 ${category.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle>{category.category}</CardTitle>
                      <CardDescription>{t("catalog.availableCourses", { count: category.items.length })}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.items.map((course, courseIdx) => (
                      <Card key={courseIdx} className="bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-2 mb-2">
                                <h4 className="font-semibold">{course.title}</h4>
                                {course.required && (
                                  <Badge variant="destructive" className="text-xs">{t("catalog.requiredBadge")}</Badge>
                                )}
                              </div>
                              <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">{t("catalog.labels.format")}</span> {course.format}
                                </div>
                                <div>
                                  <span className="font-medium">{t("catalog.labels.target")}</span> {course.target}
                                </div>
                                <div className="md:col-span-3">
                                  <span className="font-medium">{t("catalog.labels.why")}</span> {course.reason}
                                </div>
                              </div>
                            </div>
                            {course.title.toLowerCase().includes("diisocyanater") ? (
                              <Button size="sm" variant="outline" asChild>
                                <a href="#bestill-kurs">
                                  {t("catalog.orderFromCompany")}
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" asChild>
                                <Link href="#bestill-kurs">
                                  {t("catalog.order")}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Førstehjelp */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Førstehjelp med egen spesialist</h2>
            <p className="text-muted-foreground">
              Vår sykepleier/jordmor har spesialkompetanse på førstehjelp for både barn og voksne
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Baby className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Førstehjelp for barn</CardTitle>
                <CardDescription>Spesielt viktig for barnehager og skoler</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>HLR for spedbarn og barn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Kvelning og fremmedlegeme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Allergiske reaksjoner og EpiPen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Brannskader og sårbehandling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Hjernerystelse og hodeskader</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Heart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Førstehjelp for voksne</CardTitle>
                <CardDescription>Standard og avansert nivå</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>HLR med hjertestarter (AED)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Brannskader og forgiftninger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Brudd, forstuvninger og blødninger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Hjerneslag og hjerteinfarkt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Sjokkbehandling og stabilisering</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Godkjent av Norsk Førstehjelpsråd</h3>
                <p className="text-muted-foreground mb-4">
                  Alle våre førstehjelp-kurs er godkjent og gir sertifikat gyldig i 2 år
                </p>
                <Button size="lg" asChild>
                  <Link href="#bestill-kurs">
                    Bestill førstehjelp-kurs
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Om HMS Nova AS */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              HMS Nova AS – Din godkjente kursleverandør
            </h2>
            <p className="text-muted-foreground">
              Over 500 gjennomførte kurs, 2000+ fornøyde deltakere, og 15+ års erfaring
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Godkjent av Arbeidstilsynet</h3>
                    <p className="text-sm text-muted-foreground">
                      HMS Nova AS er en godkjent kursleverandør som følger ISO 9001-standarden. 
                      Alle kurs oppfyller Arbeidstilsynets strenge krav og retningslinjer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">15+ års erfaring</h3>
                    <p className="text-sm text-muted-foreground">
                      Med over 500 gjennomførte kurs og 2000+ fornøyde deltakere, 
                      har HMS Nova AS solid erfaring innen HMS-opplæring og kompetanseutvikling.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Sertifiserte instruktører</h3>
                    <p className="text-sm text-muted-foreground">
                      Alle våre instruktører er sertifiserte og har lang erfaring fra 
                      bransjen. De gir praktisk, engasjerende og relevant opplæring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Laptop className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">HMS Nova-integrasjon</h3>
                    <p className="text-sm text-muted-foreground">
                      HMS Nova AS eier og utvikler HMS Nova. Alle kurs integreres automatisk 
                      i systemet for komplett kompetansestyring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link href="/">
                Besøk HMS Nova for mer informasjon
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Kontakt:</strong> Kurs: <a href="tel:+4791540824" className="underline">+47 91 54 08 24</a> | 
              Software: <a href="tel:+4799112916" className="underline">+47 99 11 29 16</a> | 
              <a href="mailto:post@hmsnova.no" className="underline">post@hmsnova.no</a>
            </p>
          </div>
        </div>
      </section>

      {/* Fordeler */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor velge HMS Nova AS for kurs?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Automatisk kompetansestyring</h3>
                    <p className="text-sm text-muted-foreground">
                      Alle sertifikater registreres i HMS Nova. Systemet varsler deg automatisk 
                      når kurs går ut – ingen manuelt arbeid.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Erfarne instruktører</h3>
                    <p className="text-sm text-muted-foreground">
                      Alle våre instruktører er godkjente og har lang erfaring fra bransjen. 
                      Praktisk, engasjerende og relevant opplæring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Laptop className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Fleksible kursformer</h3>
                    <p className="text-sm text-muted-foreground">
                      Fysiske kurs på din arbeidsplass, nettbaserte e-læring, eller hybrid. 
                      Vi tilpasser oss dine behov.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">ISO 9001-dokumentasjon</h3>
                    <p className="text-sm text-muted-foreground">
                      Kompetansematriser, kursbevis og oppfølgingsplaner dokumenteres automatisk 
                      i HMS Nova – klart for revisjon.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Medlemsfordeler */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">🎁 Medlemsfordel: 20% rabatt på alle kurs</h2>
              <p className="text-lg text-muted-foreground">
                Er du <strong>HMS Nova-medlem</strong>? Da får du automatisk <strong className="text-green-600">20% rabatt</strong> på:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Alle HMS-kurs via HMS Nova</p>
                      <p className="text-sm text-muted-foreground">Verneombud, ledelse, psykososialt, fallsikring, truck, m.m.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">HMS Nova AS sine andre kurs</p>
                      <p className="text-sm text-muted-foreground">Inkl. spesialkurs og diisocyanater</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Hvordan få tilgang?</strong> Oppgi ditt org.nr eller medlemsnummer ved bestilling.
              </p>
              <Button size="lg" variant="default" asChild>
                <Link href="/bedriftshelsetjeneste">
                  Les mer om BHT og kurs fra HMS Nova
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bestill kurs */}
      <section id="bestill-kurs" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">{t("booking.title")}</h2>
            <p className="text-muted-foreground">
              {t("booking.description")}
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium mb-2">
                      {t("booking.fields.company.label")}
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t("booking.fields.company.placeholder")}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="orgNr" className="block text-sm font-medium mb-2">
                      {t("booking.fields.orgNr.label")}
                    </label>
                    <input
                      type="text"
                      id="orgNr"
                      value={formData.orgNr}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t("booking.fields.orgNr.placeholder")}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      {t("booking.fields.name.label")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t("booking.fields.name.placeholder")}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      {t("booking.fields.email.label")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t("booking.fields.email.placeholder")}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    {t("booking.fields.phone.label")}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("booking.fields.phone.placeholder")}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="courseType" className="block text-sm font-medium mb-2">
                    {t("booking.fields.courseType.label")}
                  </label>
                  <select
                    id="courseType"
                    value={formData.courseType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">{t("booking.fields.courseType.options.default")}</option>
                    <option value="verneombud">{t("booking.fields.courseType.options.verneombud")}</option>
                    <option value="leder">{t("booking.fields.courseType.options.leder")}</option>
                    <option value="psykososialt">{t("booking.fields.courseType.options.psykososialt")}</option>
                    <option value="fallsikring">{t("booking.fields.courseType.options.fallsikring")}</option>
                    <option value="asbest">{t("booking.fields.courseType.options.asbest")}</option>
                    <option value="maskinsikkerhet">{t("booking.fields.courseType.options.maskinsikkerhet")}</option>
                    <option value="kjemikalie">{t("booking.fields.courseType.options.kjemikalie")}</option>
                    <option value="vold">{t("booking.fields.courseType.options.vold")}</option>
                    <option value="ergonomi">{t("booking.fields.courseType.options.ergonomi")}</option>
                    <option value="trafikk">{t("booking.fields.courseType.options.trafikk")}</option>
                    <option value="truck">{t("booking.fields.courseType.options.truck")}</option>
                    <option value="digital">{t("booking.fields.courseType.options.digital")}</option>
                    <option value="inneklima">{t("booking.fields.courseType.options.inneklima")}</option>
                    <option value="forstehjelp-barn">{t("booking.fields.courseType.options.forstehjelpBarn")}</option>
                    <option value="forstehjelp-voksne">{t("booking.fields.courseType.options.forstehjelpVoksne")}</option>
                    <option value="annet">{t("booking.fields.courseType.options.other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="participants" className="block text-sm font-medium mb-2">
                    {t("booking.fields.participants.label")}
                  </label>
                  <input
                    type="number"
                    id="participants"
                    value={formData.participants}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("booking.fields.participants.placeholder")}
                    min="1"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="format" className="block text-sm font-medium mb-2">
                    {t("booking.fields.format.label")}
                  </label>
                  <select
                    id="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">{t("booking.fields.format.options.default")}</option>
                    <option value="fysisk-hos-oss">{t("booking.fields.format.options.fysiskHosOss")}</option>
                    <option value="fysisk-hos-dere">{t("booking.fields.format.options.fysiskHosDere")}</option>
                    <option value="nettbasert">{t("booking.fields.format.options.nettbasert")}</option>
                    <option value="hybrid">{t("booking.fields.format.options.hybrid")}</option>
                    <option value="vet-ikke">{t("booking.fields.format.options.unknown")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    {t("booking.fields.message.label")}
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t("booking.fields.message.placeholder")}
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t("booking.memberDiscount.title")}</strong> {t("booking.memberDiscount.description")}
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("booking.submit.sending")}
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-5 w-5" />
                      {t("booking.submit.default")}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {t("booking.contact.title")} <br />
                  <strong>{t("booking.contact.courseLabel")}</strong>{" "}
                  <a href="tel:+4791540824" className="text-primary hover:underline">+47 91 54 08 24</a> | {" "}
                  <strong>{t("booking.contact.softwareLabel")}</strong>{" "}
                  <a href="tel:+4799112916" className="text-primary hover:underline">+47 99 11 29 16</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

