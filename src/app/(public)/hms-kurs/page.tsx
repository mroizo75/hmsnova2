"use client";

import { useState } from "react";
import Link from "next/link";
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
        throw new Error(data.error || "Noe gikk galt");
      }

      toast({
        title: data.isMember ? "🎉 Kursbestilling sendt - 20% rabatt aktivert!" : "✅ Kursbestilling sendt!",
        description: data.isMember 
          ? `Vi kontakter deg innen 24 timer. Du spar ${data.discountAmount?.toLocaleString('nb-NO')} kr med medlemsrabatten!`
          : "Vi kontakter deg innen 24 timer for å avtale dato og opplegg.",
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
        title: "❌ Kunne ikke sende bestilling",
        description: error instanceof Error ? error.message : "Vennligst prøv igjen eller ring oss direkte.",
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
              HMS-kurs & Førstehjelp
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Kompetente ansatte.<br />
              <span className="text-primary">Tryggere arbeidsplass.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              <strong>HMS Nova-medlemmer</strong> får <strong className="text-primary">20% rabatt</strong> på alle HMS-kurs! 
              Alle kurs er sertifiserte og følger Arbeidstilsynets krav – med automatisk kompetansestyring i HMS Nova.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="#bestill-kurs">
                  <Award className="mr-2 h-5 w-5" />
                  Bestill HMS-kurs
                </Link>
              </Button>
              <Link href="#kursoversikt">
                <Button size="lg" variant="outline">
                  Se kurskatalog
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              ✓ Godkjent kursleverandør (ISO 9001)<br/>
              ✓ Fysiske, digitale og hybride løsninger<br/>
              ✓ Sertifikater integrert i HMS Nova<br/>
              ✓ Spesialist på førstehjelp barn og voksne
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
                    <h3 className="font-bold text-xl">Førstehjelp-spesialist</h3>
                    <p className="text-sm text-muted-foreground">Sykepleier/jordmor</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Baby className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Førstehjelp for barn</p>
                      <p className="text-sm text-muted-foreground">Spesialtilpasset for barnehager og skoler</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Førstehjelp for voksne</p>
                      <p className="text-sm text-muted-foreground">HLR, brannskader, forgiftninger</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Sertifisert opplæring</p>
                      <p className="text-sm text-muted-foreground">Godkjent av Norsk Førstehjelpsråd</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold text-primary text-center">
                    🎓 Kurs på din arbeidsplass eller digitalt
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
              Uten riktig HMS-opplæring risikerer bedriften din
            </h2>
            <p className="text-muted-foreground">
              Manglende kompetanse er den vanligste årsaken til arbeidsulykker og Arbeidstilsynets pålegg
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Brudd på lovkrav</h3>
                <p className="text-sm text-muted-foreground">
                  Arbeidsmiljøloven krever dokumentert opplæring. Manglende kurs kan gi <strong>bøter 
                  inntil 15% av omsetning</strong> og stans i virksomheten.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <TrendingDown className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Arbeidsulykker og sykefravær</h3>
                <p className="text-sm text-muted-foreground">
                  60% av arbeidsulykker skyldes manglende opplæring. Dette koster norske bedrifter 
                  <strong> over 30 milliarder kr årlig</strong> i sykefravær og erstatninger.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Ansatte føler seg utrygge</h3>
                <p className="text-sm text-muted-foreground">
                  Bedrifter uten god HMS-opplæring har <strong>50% høyere turnover</strong>. 
                  Ansatte slutter fordi de ikke føler seg trygge på jobb.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Manglende dokumentasjon</h3>
                <p className="text-sm text-muted-foreground">
                  Uten system for å spore kurs og sertifikater mister du oversikten. 
                  <strong> Utgåtte kurs oppdages først av Arbeidstilsynet</strong> – da er det for sent.
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
            Løsningen
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            HMS Nova = Komplett kursløsning + Automatisk sporing
          </h2>
          <p className="text-xl text-muted-foreground">
            Vi leverer <strong>alle lovpålagte HMS-kurs</strong> og holder oversikt over hvem som må ta hva – når
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Bestill kurs</h3>
              <p className="text-sm text-muted-foreground">
                Velg kurs fra katalogen, eller få anbefaling basert på din bransje. 
                Fysisk på arbeidsplassen eller digitalt.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Gjennomfør opplæring</h3>
              <p className="text-sm text-muted-foreground">
                Godkjente instruktører med lang erfaring. Praktisk, engasjerende 
                og tilpasset din virksomhet.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Automatisk oppfølging</h3>
              <p className="text-sm text-muted-foreground">
                Sertifikater legges inn i HMS Nova. Du får automatisk varsel når 
                kurs går ut – ingen manuelt arbeid.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Kursoversikt */}
      <section id="kursoversikt" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Kurs tilpasset din bransje</h2>
            <p className="text-muted-foreground">
              Alle kurs er godkjent og oppfyller lovkrav fra Arbeidstilsynet
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
                      <CardDescription>{category.items.length} tilgjengelige kurs</CardDescription>
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
                                  <Badge variant="destructive" className="text-xs">Lovpålagt</Badge>
                                )}
                              </div>
                              <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Format:</span> {course.format}
                                </div>
                                <div>
                                  <span className="font-medium">Målgruppe:</span> {course.target}
                                </div>
                                <div className="md:col-span-3">
                                  <span className="font-medium">Hvorfor:</span> {course.reason}
                                </div>
                              </div>
                            </div>
                            {course.title.toLowerCase().includes("diisocyanater") ? (
                              <Button size="sm" variant="outline" asChild>
                                <a href="https://www.kksas.no/kurs/diisocynaterkurs" target="_blank" rel="noopener noreferrer">
                                  Bestill hos KKS AS
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" asChild>
                                <Link href="#bestill-kurs">
                                  Bestill
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

      {/* Om KKS AS */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              KKS AS – Din godkjente kursleverandør
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
                      KKS AS er en godkjent kursleverandør som følger ISO 9001-standarden. 
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
                      har KKS AS solid erfaring innen HMS-opplæring og kompetanseutvikling.
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
                      KKS AS eier og utvikler HMS Nova. Alle kurs integreres automatisk 
                      i systemet for komplett kompetansestyring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <a href="https://www.kksas.no/" target="_blank" rel="noopener noreferrer">
                Besøk KKS AS for mer informasjon
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Kontakt:</strong> Kurs: <a href="tel:+4791540824" className="underline">+47 91 54 08 24</a> | 
              Software: <a href="tel:+4799112916" className="underline">+47 99 11 29 16</a> | 
              <a href="mailto:post@kksas.no" className="underline">post@kksas.no</a>
            </p>
          </div>
        </div>
      </section>

      {/* Fordeler */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor velge KKS AS + HMS Nova for kurs?
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
                Er du medlem med <strong>BHT + HMS Nova</strong>? Da får du automatisk <strong className="text-green-600">20% rabatt</strong> på:
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
                      <p className="font-semibold">KKS AS sine andre kurs</p>
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
                  Les mer om BHT + HMS Nova medlemskap
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
            <h2 className="text-3xl font-bold mb-4">Bestill HMS-kurs</h2>
            <p className="text-muted-foreground">
              Fyll ut skjemaet nedenfor, så kontakter vi deg innen 24 timer for å avtale dato og opplegg.
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium mb-2">
                      Bedriftsnavn *
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Eksempel AS"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="orgNr" className="block text-sm font-medium mb-2">
                      Org.nr (for medlemsrabatt)
                    </label>
                    <input
                      type="text"
                      id="orgNr"
                      value={formData.orgNr}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="123 456 789"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Kontaktperson *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ola Nordmann"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      E-post *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="ola@eksempel.no"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+47 123 45 678"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="courseType" className="block text-sm font-medium mb-2">
                    Hvilket kurs er du interessert i? *
                  </label>
                  <select
                    id="courseType"
                    value={formData.courseType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Velg kurs...</option>
                    <option value="verneombud">Grunnleggende HMS for verneombud (40t)</option>
                    <option value="leder">Lovpålagt HMS for ledere</option>
                    <option value="psykososialt">Psykososialt arbeidsmiljø</option>
                    <option value="fallsikring">Fallsikring og høydearbeid</option>
                    <option value="asbest">Asbest og farlige materialer</option>
                    <option value="maskinsikkerhet">Maskinsikkerhet og verneutstyr</option>
                    <option value="kjemikalie">Kjemikaliehåndtering</option>
                    <option value="vold">Vold og trusler</option>
                    <option value="ergonomi">Ergonomi og forflytningsteknikk</option>
                    <option value="trafikk">Trafikksikkerhet og lastsikring</option>
                    <option value="truck">Truck- og maskinførerbevis</option>
                    <option value="digital">Digital sikkerhet</option>
                    <option value="inneklima">Inneklima og psykososialt miljø</option>
                    <option value="forstehjelp-barn">Førstehjelp for barn</option>
                    <option value="forstehjelp-voksne">Førstehjelp for voksne</option>
                    <option value="annet">Annet (spesifiser i meldingen)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="participants" className="block text-sm font-medium mb-2">
                    Antall deltakere
                  </label>
                  <input
                    type="number"
                    id="participants"
                    value={formData.participants}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="5"
                    min="1"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="format" className="block text-sm font-medium mb-2">
                    Foretrukket format *
                  </label>
                  <select
                    id="format"
                    value={formData.format}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Velg format...</option>
                    <option value="fysisk-hos-oss">Fysisk kurs hos oss (Akershus)</option>
                    <option value="fysisk-hos-dere">Fysisk kurs på vår arbeidsplass</option>
                    <option value="nettbasert">Nettbasert / E-læring</option>
                    <option value="hybrid">Hybrid (kombinasjon)</option>
                    <option value="vet-ikke">Vet ikke / Ønsker veiledning</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Melding / spesielle behov
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Fortell oss om spesielle ønsker, tidsrammer, eller spørsmål..."
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>HMS Nova medlemmer får 20% rabatt automatisk.</strong> Oppgi ditt org.nr eller medlemsnummer i skjemaet.
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sender...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-5 w-5" />
                      Send bestilling
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Eller ring oss direkte: <br />
                  <strong>Kurs:</strong> <a href="tel:+4791540824" className="text-primary hover:underline">+47 91 54 08 24</a> | {" "}
                  <strong>Software:</strong> <a href="tel:+4799112916" className="text-primary hover:underline">+47 99 11 29 16</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

