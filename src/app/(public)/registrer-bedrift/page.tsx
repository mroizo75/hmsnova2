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
import { CheckCircle2, ArrowLeft, Building2, Mail, Phone, User, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitRegistrationRequest } from "@/server/actions/registration.actions";

export default function RegistrerBedriftPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEHF, setUseEHF] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

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
              Fyll ut skjemaet under, så tar vi kontakt med deg innen 24 timer for å aktivere din konto.
              Alle planer inkluderer 14 dagers gratis prøveperiode.
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
                      <SelectItem value="1-20">1-20 ansatte (6000 kr/år)</SelectItem>
                      <SelectItem value="21-50">21-50 ansatte (8000 kr/år)</SelectItem>
                      <SelectItem value="51+">51+ ansatte (12000 kr/år)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bransje */}
                <div className="space-y-2">
                  <Label htmlFor="industry">
                    Bransje <span className="text-destructive">*</span>
                  </Label>
                  <Select name="industry" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg bransje" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bygg og anlegg">Bygg og anlegg</SelectItem>
                      <SelectItem value="Helsevesen">Helsevesen</SelectItem>
                      <SelectItem value="Transport og logistikk">Transport og logistikk</SelectItem>
                      <SelectItem value="Industri og produksjon">Industri og produksjon</SelectItem>
                      <SelectItem value="Handel og service">Handel og service</SelectItem>
                      <SelectItem value="Hotell og restaurant">Hotell og restaurant</SelectItem>
                      <SelectItem value="Utdanning">Utdanning</SelectItem>
                      <SelectItem value="Teknologi og IT">Teknologi og IT</SelectItem>
                      <SelectItem value="Landbruk">Landbruk</SelectItem>
                      <SelectItem value="Annet">Annet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={isSubmitting}
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
                    vilkår
                  </Link>{" "}
                  og{" "}
                  <Link href="/personvern" className="underline">
                    personvernserklæring
                  </Link>
                  .
                </p>
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

