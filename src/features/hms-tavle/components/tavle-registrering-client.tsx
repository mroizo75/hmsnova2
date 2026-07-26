"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Monitor,
  QrCode,
  Users,
  Zap,
  ArrowRight,
  Building2,
  Search,
  FileText,
  ExternalLink,
} from "lucide-react";
import { PLAN_LABELS, PLAN_PRICES, PLAN_LIMITS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { HmsTavlePlan } from "@prisma/client";

const STANDALONE_PLANS: HmsTavlePlan[] = ["ENKEL", "STANDARD", "AVANSERT"];

const PLAN_HIGHLIGHTS: Record<HmsTavlePlan, string[]> = {
  ENKEL: ["1 tavle", "Kontaktinfo og beredskap", "SHA-plan lenke", "Dokumenthub"],
  STANDARD: [
    "3 tavler",
    "QR-innsjekk (§ 15)",
    "UE-portal",
    "Gjesteservice med QR og statussporing",
    "Avvik og mannskapsliste",
    "Yr.no-integrering",
  ],
  AVANSERT: [
    "Ubegrensede tavler",
    "Kiosk-modus for storskjerm",
    "Lovkrav-sjekkliste",
    "KPI-dashboard",
    "AI-innsikt",
  ],
  ADDON: [],
};

const DURATION_OPTIONS = [
  { value: 1, label: "1 måned" },
  { value: 3, label: "3 måneder" },
  { value: 6, label: "6 måneder (-5%)" },
  { value: 12, label: "12 måneder (-10%)" },
];

type Step = "plan" | "company" | "confirm" | "success";

export function TavleRegistreringClient({ initialPlan }: { initialPlan?: HmsTavlePlan }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<HmsTavlePlan | null>(initialPlan ?? null);
  const [duration, setDuration] = useState(3);
  const [orgSearch, setOrgSearch] = useState("");
  const [company, setCompany] = useState<{
    orgNr: string;
    name: string;
    address: string;
    email: string;
    invoiceEmail: string;
    contactPerson: string;
    phone: string;
  }>({
    orgNr: "",
    name: "",
    address: "",
    email: "",
    invoiceEmail: "",
    contactPerson: "",
    phone: "",
  });
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAngrerrett, setAcceptedAngrerrett] = useState(false);

  async function lookupOrg() {
    const cleaned = orgSearch.replace(/\D/g, "");
    if (!cleaned) return toast.error("Skriv inn org.nr. (9 siffer)");
    if (cleaned.length !== 9) return toast.error("Org.nr. må ha nøyaktig 9 siffer");

    setSearching(true);
    try {
      const res = await fetch(`/api/brreg/${cleaned}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message ?? "Fant ikke bedriften i Enhetsregisteret");
      }

      const data = json.data;

      if (data.konkurs) {
        toast.error(`${data.navn} er registrert som konkurs i Enhetsregisteret`);
      } else if (data.underAvvikling) {
        toast.error(`${data.navn} er under avvikling`);
      }

      setCompany({
        ...company,
        orgNr: data.orgNr,
        name: data.navn,
        address: data.adresse,
        email: "",
        invoiceEmail: "",
        contactPerson: "",
        phone: "",
      });

      toast.success(`Fant: ${data.navn}`);
    } catch (err: any) {
      toast.error(err.message ?? "Fant ikke bedriften");
    } finally {
      setSearching(false);
    }
  }

  function getDiscount(months: number) {
    if (months >= 12) return 0.1;
    if (months >= 6) return 0.05;
    return 0;
  }

  function calcTotal(plan: HmsTavlePlan, months: number) {
    const base = PLAN_PRICES[plan] * months;
    const discount = getDiscount(months);
    return Math.round(base * (1 - discount));
  }

  async function handleSubmit() {
    if (!selectedPlan || !company.name || !company.orgNr) {
      toast.error("Fyll ut alle påkrevde felter");
      return;
    }
    if (!company.email && !company.invoiceEmail) {
      toast.error("E-postadresse er påkrevd");
      return;
    }
    if (!acceptedAngrerrett || !acceptedTerms) {
      toast.error("Du må lese og godta begge avtaledokumentene for å fortsette.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hms-tavle/standalone-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          durationMonths: duration,
          company,
          totalPrice: calcTotal(selectedPlan, duration),
          acceptedTerms: true,
          acceptedAngrerrett: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Feil ved registrering");
      setOrderId(json.data?.subscriptionId ?? null);
      setLoginUrl(json.data?.loginUrl ?? "/login");
      setRegisteredEmail(json.data?.email ?? company.email);
      setStep("success");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Steg 1: Velg plan */}
      {step === "plan" && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {STANDALONE_PLANS.map((plan) => {
              const price = PLAN_PRICES[plan];
              const isSelected = selectedPlan === plan;
              return (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`text-left p-5 rounded-xl border-2 bg-white transition-all ${
                    isSelected
                      ? "border-blue-600 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-lg">{PLAN_LABELS[plan]}</p>
                      <p className="text-blue-700 font-semibold">
                        kr {price}
                        <span className="text-sm text-gray-500 font-normal"> / mnd</span>
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-6 w-6 text-blue-600 mt-1" />}
                  </div>
                  <ul className="mt-3 space-y-1">
                    {PLAN_HIGHLIGHTS[plan].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {selectedPlan && (
            <Card>
              <CardContent className="p-4">
                <Label>Varighet</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        duration === d.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Totalt</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">
                      kr {calcTotal(selectedPlan, duration).toLocaleString("nb-NO")}
                    </p>
                    {getDiscount(duration) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {getDiscount(duration) * 100}% rabatt
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full text-base py-6"
            disabled={!selectedPlan}
            onClick={() => setStep("company")}
          >
            Neste
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </>
      )}

      {/* Steg 2: Bedriftsinfo */}
      {step === "company" && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Finn bedrift via org.nr (Brreg)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="9-sifret org.nr."
                  maxLength={9}
                  onKeyDown={(e) => e.key === "Enter" && lookupOrg()}
                />
                <Button onClick={lookupOrg} disabled={searching} variant="outline">
                  {searching ? "Søker..." : "Søk"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bedriftsinformasjon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Org.nr *</Label>
                  <Input
                    value={company.orgNr}
                    onChange={(e) => setCompany({ ...company, orgNr: e.target.value })}
                    placeholder="123 456 789"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bedriftsnavn *</Label>
                  <Input
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    placeholder="Bygg AS"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  placeholder="Gateveien 1, 0001 Oslo"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kontaktperson *</Label>
                  <Input
                    value={company.contactPerson}
                    onChange={(e) => setCompany({ ...company, contactPerson: e.target.value })}
                    placeholder="Ola Nordmann"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    type="tel"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    placeholder="+47 000 00 000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>E-post *</Label>
                <Input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  placeholder="kontakt@firma.no"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fakturaadresse e-post</Label>
                <Input
                  type="email"
                  value={company.invoiceEmail}
                  onChange={(e) => setCompany({ ...company, invoiceEmail: e.target.value })}
                  placeholder="regnskap@firma.no (hvis annet)"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("plan")}>
              Tilbake
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep("confirm")}
              disabled={!company.name || !company.orgNr || !company.email}
            >
              Bekreft
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Steg 3: Bekreft */}
      {step === "confirm" && selectedPlan && (
        <>
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold">Oppsummering</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{PLAN_LABELS[selectedPlan]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Varighet</span>
                  <span className="font-medium">{duration} måneder</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bedrift</span>
                  <span className="font-medium">{company.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Org.nr.</span>
                  <span className="font-mono">{company.orgNr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Faktura til</span>
                  <span>{company.invoiceEmail || company.email}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Totalbeløp</span>
                  <span className="text-blue-700">
                    kr {calcTotal(selectedPlan, duration).toLocaleString("nb-NO")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Faktura sendes til {company.invoiceEmail || company.email} via Fiken. Du aktiverer
                tavlen etter betaling. MVA kommer i tillegg.
              </p>
            </CardContent>
          </Card>

          {/* Avtaledokumenter */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Avtaledokumenter</h3>
              </div>
              <p className="text-xs text-gray-500">
                Les begge dokumentene og bekreft godkjenning for å fullføre bestillingen.
              </p>

              {/* Angreretten */}
              <div className="p-3 border rounded-lg bg-gray-50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-xs">Angrerettserklæring</p>
                    <p className="text-xs text-gray-500">14 dagers betenkningstid fra bestillingsdato</p>
                  </div>
                  <a
                    href="/api/documents/angrerett"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Åpne PDF
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="tavle-acceptAngrerrett"
                    checked={acceptedAngrerrett}
                    onCheckedChange={(checked) => setAcceptedAngrerrett(checked === true)}
                  />
                  <Label htmlFor="tavle-acceptAngrerrett" className="text-xs cursor-pointer leading-snug">
                    Jeg har lest og forstått angrerettserklæringen, inkludert 14-dagers
                    betenkningstid fra bestillingsdatoen.
                  </Label>
                </div>
              </div>

              {/* Abonnementsavtale */}
              <div className="p-3 border rounded-lg bg-gray-50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-xs">Abonnementsavtale</p>
                    <p className="text-xs text-gray-500">12 måneder binding · 3 måneders oppsigelse</p>
                  </div>
                  <a
                    href="/api/documents/abonnementsavtale"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Åpne PDF
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="tavle-acceptTerms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label htmlFor="tavle-acceptTerms" className="text-xs cursor-pointer leading-snug">
                    Jeg godtar abonnementsavtalen med{" "}
                    <strong>12 måneders binding</strong> og{" "}
                    <strong>3 måneders oppsigelse</strong> etter bindingsperioden.
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("company")}>
              Tilbake
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || !acceptedTerms || !acceptedAngrerrett}
            >
              {submitting ? "Registrerer..." : "Bestill og betal"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Steg 4: Suksess */}
      {step === "success" && (
        <div className="py-8 space-y-6">
          {/* Suksess-header */}
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">Kontoen er klar!</h2>
            <p className="text-gray-600">
              Du har nå full tilgang til Digital HMS Tavle.
            </p>
          </div>

          {/* E-postbekreftelse */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">📧 Sjekk innboksen din</p>
            <p>
              Vi har sendt innloggingsdetaljer (midlertidig passord) til{" "}
              <span className="font-mono font-bold">{registeredEmail}</span>.
              Husk å sjekke søppelpost om du ikke ser e-posten innen få minutter.
            </p>
          </div>

          {/* Umiddelbar tilgang */}
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => router.push(loginUrl ?? "/login")}
            >
              Logg inn og sett opp tavlen din →
            </Button>
            <p className="text-center text-xs text-gray-500">
              Bruk e-posten og det midlertidige passordet fra velkomstmailen.
            </p>
          </div>

          {/* Steg etter innlogging */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Etter innlogging:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Bytt det midlertidige passordet</li>
              <li>Opprett din første digitale HMS-tavle</li>
              <li>Del QR-koden med mannskapet på byggeplassen</li>
            </ol>
          </div>

          {orderId && (
            <p className="text-center text-xs text-gray-400 font-mono">Ref: {orderId}</p>
          )}

          <p className="text-center text-sm text-gray-600">
            Spørsmål?{" "}
            <a href="mailto:post@hmsnova.no" className="text-blue-600 underline">
              post@hmsnova.no
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
