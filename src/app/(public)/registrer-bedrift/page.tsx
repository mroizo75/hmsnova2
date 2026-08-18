"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, Building2, Mail, Phone, User, MapPin, FileText, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitRegistrationRequest } from "@/server/actions/registration.actions";
import { AGRICULTURE_FARM_TYPES, SUPPORTED_INDUSTRIES } from "@/lib/industry-packages";

export default function RegistrerBedriftPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEHF, setUseEHF] = useState(true);
  const [industry, setIndustry] = useState<string>("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAngrerrett, setAcceptedAngrerrett] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!acceptedAngrerrett || !acceptedTerms) {
      setError("Du må lese og godta begge avtale-dokumentene for å fortsette.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("acceptedTerms", "true");
    formData.set("acceptedAngrerrett", "true");

    try {
      const result = await submitRegistrationRequest(formData);
      
      if (result.success) {
        router.push("/registrer-bedrift/takk");
      } else {
        setError(result.error || "Noe gikk galt. Prøv igjen.");
      }
    } catch (err) {
      setError("En uventet feil oppstod. Prøv igjen senere.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til forsiden
            </Link>
            <Badge variant="secondary" className="mb-4">
              Registrer bedrift
            </Badge>
            <h1 className="text-4xl font-bold mb-4">Søk om tilgang til HMS Nova</h1>
            <p className="text-lg text-muted-foreground">
              Fyll ut skjemaet under, så setter vi opp en bransjetilpasset HMS-startpakke.
              For landbruk får du ferdige forslag for gårdsdrift fra første dag.
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Bedriftsinformasjon</CardTitle>
              <CardDescription>
                Vi trenger denne informasjonen for å sette opp din konto og fakturering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Bedriftsnavn */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Bedriftsnavn <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      placeholder="Bedrift AS"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Organisasjonsnummer */}
                <div className="space-y-2">
                  <Label htmlFor="orgNumber">
                    Organisasjonsnummer <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="orgNumber"
                    name="orgNumber"
                    type="text"
                    required
                    placeholder="123 456 789"
                    pattern="[0-9\s]{9,11}"
                  />
                  <p className="text-xs text-muted-foreground">9 siffer</p>
                </div>

                {/* Antall ansatte */}
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">
                    Antall ansatte <span className="text-destructive">*</span>
                  </Label>
                  <Select name="employeeCount" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg antall ansatte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-20">1-20 ansatte</SelectItem>
                      <SelectItem value="21-50">21-50 ansatte</SelectItem>
                      <SelectItem value="51+">51+ ansatte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bransje */}
                <div className="space-y-2">
                  <Label htmlFor="industry">
                    Hva driver du med? <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    required
                    onValueChange={(value) => setIndustry(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg bransje" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_INDUSTRIES.map((industryOption) => (
                        <SelectItem key={industryOption.value} value={industryOption.value}>
                          {industryOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="industry" value={industry} />
                </div>

                {industry === "agriculture" && (
                  <div className="space-y-2">
                    <Label htmlFor="farmType">
                      Velg gårdstype <span className="text-destructive">*</span>
                    </Label>
                    <Select name="farmType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg gårdstype" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGRICULTURE_FARM_TYPES.map((farmType) => (
                          <SelectItem key={farmType.value} value={farmType.label}>
                            {farmType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Kontaktperson</h3>

                  {/* Kontaktperson navn */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="contactPerson">
                      Navn <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        type="text"
                        required
                        placeholder="Ola Nordmann"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* E-post */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="contactEmail">
                      E-post <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        required
                        placeholder="ola@bedrift.no"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Brukes til innlogging og viktige varsler
                    </p>
                  </div>

                  {/* Telefon */}
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">
                      Telefon <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contactPhone"
                        name="contactPhone"
                        type="tel"
                        required
                        placeholder="+47 123 45 678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Fakturaadresse</h3>

                  {/* EHF Toggle */}
                  <div className="flex items-center space-x-2 mb-4 p-4 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="useEHF"
                      checked={useEHF}
                      onCheckedChange={(checked) => setUseEHF(checked === true)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="useEHF" className="cursor-pointer font-medium">
                        Vi mottar EHF-fakturaer
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elektronisk faktura direkte i regnskapssystemet (anbefalt)
                      </p>
                    </div>
                  </div>

                  {/* Faktura e-post (alltid synlig som backup) */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="invoiceEmail">
                      E-post for faktura {!useEHF && <span className="text-destructive">*</span>}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invoiceEmail"
                        name="invoiceEmail"
                        type="email"
                        required={!useEHF}
                        placeholder="regnsap@bedrift.no"
                        className="pl-10"
                      />
                    </div>
                    {useEHF && (
                      <p className="text-xs text-muted-foreground">
                        Brukes som backup hvis EHF feiler
                      </p>
                    )}
                  </div>

                  {/* Postadresse (kun hvis ikke EHF) */}
                  {!useEHF && (
                    <>
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="address">
                          Gateadresse <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="address"
                            name="address"
                            type="text"
                            required={!useEHF}
                            placeholder="Storgata 1"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">
                            Postnummer <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="postalCode"
                            name="postalCode"
                            type="text"
                            required={!useEHF}
                            placeholder="0123"
                            pattern="[0-9]{4}"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">
                            Poststed <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="city"
                            name="city"
                            type="text"
                            required={!useEHF}
                            placeholder="Oslo"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Melding/Kommentar */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Har du noen spørsmål eller ønsker? (valgfritt)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="F.eks. ønsker om demo, spesielle behov, etc."
                    rows={4}
                  />
                </div>

                {/* Avtaledokumenter */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Avtaledokumenter</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Les begge dokumentene og bekreft godkjenning for å fullføre søknaden.
                  </p>

                  {/* Angreretten */}
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">Angrerettserklæring</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Frivillig 14-dagers betenkningstid fra bestillingsdato
                        </p>
                      </div>
                      <a
                        href="/api/documents/angrerett"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Åpne PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="acceptAngrerrett"
                        checked={acceptedAngrerrett}
                        onCheckedChange={(checked) => setAcceptedAngrerrett(checked === true)}
                      />
                      <Label htmlFor="acceptAngrerrett" className="text-sm cursor-pointer leading-snug">
                        Jeg har lest og forstått angrerettserklæringen, inkludert at den frivillige
                        14-dagers betenkningstiden gjelder fra bestillingsdatoen.
                      </Label>
                    </div>
                  </div>

                  {/* Abonnementsavtale */}
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">Abonnementsavtale</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          12 måneder binding · 3 måneders oppsigelse
                        </p>
                      </div>
                      <a
                        href="/api/documents/abonnementsavtale"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Åpne PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="acceptTerms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      />
                      <Label htmlFor="acceptTerms" className="text-sm cursor-pointer leading-snug">
                        Jeg godtar abonnementsavtalen, herunder{" "}
                        <strong>12 måneders binding</strong> og{" "}
                        <strong>3 måneders oppsigelsestid</strong> etter bindingsperioden.
                        Avtalen er juridisk bindende ved innsending.
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={isSubmitting || !acceptedTerms || !acceptedAngrerrett}
                  >
                    {isSubmitting ? "Sender..." : "Send søknad"}
                  </Button>
                  <Link href="/" className="flex-1">
                    <Button type="button" variant="outline" size="lg" className="w-full">
                      Avbryt
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Ved å sende inn dette skjemaet godtar du våre{" "}
                  <Link href="/vilkar" className="underline">
                    bruksvilkår
                  </Link>{" "}
                  og{" "}
                  <Link href="/personvern" className="underline">
                    personvernerklæring
                  </Link>
                  , inkludert deltakelse i anonymisert bransjestatistikk (kan deaktiveres i innstillinger).
                </p>
                {industry === "agriculture" && (
                  <p className="text-xs text-center text-muted-foreground">
                    For landbruk preutfyller vi forslag til risikovurdering, SJA og vernerunder.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">Rask aktivering</h3>
                <p className="text-xs text-muted-foreground">
                  Vi setter opp din konto innen 24 timer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">14 dagers prøveperiode</h3>
                <p className="text-xs text-muted-foreground">
                  Test alle funksjoner uten forpliktelser
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">Personlig oppfølging</h3>
                <p className="text-xs text-muted-foreground">
                  Vi hjelper deg med å komme i gang
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

