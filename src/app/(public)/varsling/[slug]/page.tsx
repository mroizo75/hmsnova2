"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, FileText, Shield, Lock } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useParams } from "next/navigation";

type WhistleblowCategory =
  | "HARASSMENT"
  | "DISCRIMINATION"
  | "WORK_ENVIRONMENT"
  | "SAFETY"
  | "CORRUPTION"
  | "ETHICS"
  | "LEGAL"
  | "OTHER";

interface TenantInfo {
  id: string;
  name: string;
}

export default function TenantWhistleblowingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [caseInfo, setCaseInfo] = useState<{ caseNumber: string; accessCode: string } | null>(
    null
  );
  const [formData, setFormData] = useState({
    category: "OTHER" as WhistleblowCategory,
    title: "",
    description: "",
    occurredAt: "",
    location: "",
    involvedPersons: "",
    witnesses: "",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    isAnonymous: true,
  });
  
  // Honeypot felt (skjult) - bots fyller ut dette
  const [honeypot, setHoneypot] = useState("");

  // Hent tenant info basert på slug
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`/api/public/tenant/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setTenant(data.tenant);
        } else {
          toast({
            title: "Feil",
            description: "Kunne ikke finne varslingskanal for denne bedriften",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch tenant:", error);
      } finally {
        setLoadingTenant(false);
      }
    };

    fetchTenant();
  }, [slug, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) {
      toast({
        title: "Feil",
        description: "Bedriftsinformasjon mangler",
        variant: "destructive",
      });
      return;
    }
    
    // Anti-bot sjekker
    // 1. Honeypot - hvis fylt ut = bot
    if (honeypot) {
      toast({
        title: "Feil",
        description: "Ugyldig innsending",
        variant: "destructive",
      });
      return;
    }
    
    // 2. Tidssjekk - må bruke minst 5 sekunder (bots er for raske)
    const timeSpent = (Date.now() - startTime) / 1000;
    if (timeSpent < 5) {
      toast({
        title: "Feil",
        description: "Vennligst ta deg tid til å fylle ut skjemaet",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      if (!formData.title || !formData.description) {
        throw new Error("Tittel og beskrivelse er påkrevd");
      }

      const payload: any = {
        tenantId: tenant.id,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        isAnonymous: formData.isAnonymous,
        _hp: honeypot, // Send honeypot for server-side validering også
      };

      if (formData.occurredAt) {
        payload.occurredAt = new Date(formData.occurredAt).toISOString();
      }

      if (formData.location) payload.location = formData.location;
      if (formData.involvedPersons) payload.involvedPersons = formData.involvedPersons;
      if (formData.witnesses) payload.witnesses = formData.witnesses;

      if (!formData.isAnonymous) {
        if (formData.reporterName) payload.reporterName = formData.reporterName;
        if (formData.reporterEmail) payload.reporterEmail = formData.reporterEmail;
        if (formData.reporterPhone) payload.reporterPhone = formData.reporterPhone;
      }

      const response = await fetch("/api/whistleblowing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke sende varsling");
      }

      setCaseInfo({
        caseNumber: data.data.caseNumber,
        accessCode: data.data.accessCode,
      });

      setSubmitted(true);

      toast({
        title: "Varsling sendt",
        description: "Din varsling er mottatt og vil bli behandlet konfidensielt",
      });
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Laster...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Feil</AlertTitle>
            <AlertDescription>
              Kunne ikke finne varslingskanal for denne bedriften.
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button asChild>
              <Link href="/">Tilbake til forsiden</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && caseInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <Link href="/">
              <h1 className="text-3xl font-bold">HMS Nova</h1>
            </Link>
            <p className="mt-2 text-muted-foreground">Anonym varsling</p>
          </div>

          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle className="text-green-900 dark:text-green-100">
                  Varsling mottatt
                </CardTitle>
              </div>
              <CardDescription className="text-green-700 dark:text-green-300">
                Din varsling er nå registrert og vil bli behandlet konfidensielt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Viktig informasjon</AlertTitle>
                <AlertDescription>
                  Ta vare på saksnummer og tilgangskode for å følge med på saken din.
                  Denne informasjonen vises kun én gang.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Saksnummer</p>
                  <p className="text-2xl font-bold">{caseInfo.caseNumber}</p>
                </div>

                <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Tilgangskode</p>
                  <p className="text-2xl font-bold font-mono">{caseInfo.accessCode}</p>
                </div>
              </div>

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Slik følger du med på saken</AlertTitle>
                <AlertDescription>
                  Bruk saksnummer og tilgangskode på{" "}
                  <Link href="/varsling/spor" className="font-medium underline">
                    sporingssiden
                  </Link>{" "}
                  for å se status og meldinger fra saksbehandler.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center gap-4 pt-4">
                <Button asChild>
                  <Link href="/varsling/spor">Spor saken</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Tilbake til forsiden</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <Link href="/">
            <h1 className="text-3xl font-bold">HMS Nova</h1>
          </Link>
          <p className="mt-2 text-muted-foreground">Anonym varsling til {tenant.name}</p>
        </div>

        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertTitle>Konfidensielt og trygt</AlertTitle>
          <AlertDescription>
            All informasjon du sender blir behandlet konfidensielt. Du kan velge å være helt
            anonym eller oppgi kontaktinformasjon hvis du ønsker det.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot felt - skjult for mennesker, synlig for bots */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          
          {/* Grunnleggende info */}
          <Card>
            <CardHeader>
              <CardTitle>Grunnleggende informasjon</CardTitle>
              <CardDescription>
                Fyll inn informasjon om hendelsen du ønsker å varsle om
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: WhistleblowCategory) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARASSMENT">Trakassering</SelectItem>
                    <SelectItem value="DISCRIMINATION">Diskriminering</SelectItem>
                    <SelectItem value="WORK_ENVIRONMENT">Arbeidsmiljø</SelectItem>
                    <SelectItem value="SAFETY">HMS/Sikkerhet</SelectItem>
                    <SelectItem value="CORRUPTION">Korrupsjon/Underslag</SelectItem>
                    <SelectItem value="ETHICS">Etikk</SelectItem>
                    <SelectItem value="LEGAL">Lovbrudd</SelectItem>
                    <SelectItem value="OTHER">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Tittel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Kort beskrivelse av hendelsen"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Detaljert beskrivelse <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beskriv hendelsen så detaljert som mulig..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 tegn. Jo mer detaljer, desto bedre kan saken behandles.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occurredAt">Når skjedde dette?</Label>
                <Input
                  id="occurredAt"
                  type="datetime-local"
                  value={formData.occurredAt}
                  onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Hvor skjedde dette?</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="F.eks. 'Kontoret i Oslo' eller 'Byggeplass X'"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personer involvert */}
          <Card>
            <CardHeader>
              <CardTitle>Personer involvert</CardTitle>
              <CardDescription>Frivillig, men kan hjelpe i saksbehandlingen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="involvedPersons">Personer som er involvert</Label>
                <Textarea
                  id="involvedPersons"
                  value={formData.involvedPersons}
                  onChange={(e) => setFormData({ ...formData, involvedPersons: e.target.value })}
                  placeholder="Navn, roller eller andre identifikasjoner"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="witnesses">Vitner</Label>
                <Textarea
                  id="witnesses"
                  value={formData.witnesses}
                  onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                  placeholder="Personer som kan bekrefte eller ha sett hendelsen"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anonymitet */}
          <Card>
            <CardHeader>
              <CardTitle>Vil du være anonym?</CardTitle>
              <CardDescription>
                Du kan velge å oppgi kontaktinformasjon hvis du ønsker tilbakemelding direkte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isAnonymous" className="cursor-pointer">
                  Jeg ønsker å være helt anonym
                </Label>
              </div>

              {!formData.isAnonymous && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertTitle>Kontaktinformasjon</AlertTitle>
                      <AlertDescription>
                        Ved å oppgi kontaktinformasjon kan saksbehandler kontakte deg direkte
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="reporterName">Ditt navn</Label>
                      <Input
                        id="reporterName"
                        value={formData.reporterName}
                        onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                        placeholder="Fullt navn"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reporterEmail">E-post</Label>
                      <Input
                        id="reporterEmail"
                        type="email"
                        value={formData.reporterEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, reporterEmail: e.target.value })
                        }
                        placeholder="din@epost.no"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reporterPhone">Telefon</Label>
                      <Input
                        id="reporterPhone"
                        type="tel"
                        value={formData.reporterPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, reporterPhone: e.target.value })
                        }
                        placeholder="+47 123 45 678"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/">Avbryt</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sender..." : "Send varsling"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

