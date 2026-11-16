import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
} from "lucide-react";

const KKS_KURS_URL = "https://www.kksas.no/kurs";

export default function HMSKursPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Opplæring og kurs
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Dokumentert opplæring i HMS Nova.
            <br />
            Sertifiserte kurs hos KKS AS.
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            HMS Nova holder oversikt over hvem som har hvilken opplæring.
            Sertifiserte kurs gjennomføres av KKS AS, som er i samme eierkrets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href={KKS_KURS_URL} target="_blank" rel="noopener noreferrer">
                Se kurs hos KKS AS
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/priser">Se pris på HMS Nova</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <ClipboardList className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Dokumentert opplæring i HMS Nova</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Arbeidsgiver skal sørge for nødvendig opplæring, jf. arbeidsmiljøloven § 3-2,
                og selv gjennomgå opplæring i HMS-arbeid, jf. § 3-5. Internkontrollen skal
                vise at kravene følges, jf. internkontrollforskriften § 5.
              </p>
              <ul className="space-y-2">
                {[
                  "Kompetansematrise per rolle og ansatt",
                  "Registrering av gjennomført opplæring og kursbevis",
                  "Varsling før sertifikat og kurs går ut",
                  "Oversikt dere kan vise ved tilsyn",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <GraduationCap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Sertifiserte kurs hos KKS AS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                KKS AS holder sertifiserte kurs, blant annet lovpålagt HMS-opplæring for
                ledere og verneombud. Kurskatalog, datoer og priser står på kksas.no.
                HMS Nova oppgir ikke egne kurspriser.
              </p>
              <p>
                Gjennomført kurs kan registreres i HMS Nova, slik at kompetansen ligger
                sammen med resten av HMS-arbeidet.
              </p>
              <Button variant="outline" asChild>
                <a href={KKS_KURS_URL} target="_blank" rel="noopener noreferrer">
                  Åpne kurskatalogen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Slik henger det sammen</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: BookOpen,
                title: "Kartlegg behovet",
                text: "Se hvilken opplæring rollen krever, og hvem som mangler den.",
              },
              {
                icon: Award,
                title: "Ta kurset hos KKS AS",
                text: "Bestill sertifisert kurs direkte hos KKS AS når det trengs.",
              },
              {
                icon: ClipboardList,
                title: "Dokumenter i HMS Nova",
                text: "Legg inn bevis og utløpsdato, så systemet varsler før det går ut.",
              },
            ].map((step) => (
              <Card key={step.title}>
                <CardContent className="pt-6 space-y-2">
                  <step.icon className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
