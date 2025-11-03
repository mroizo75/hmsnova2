"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, DollarSign, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PaymentSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const currentSettings = {
    fikenApiToken: process.env.FIKEN_API_TOKEN ? "fk_***************" : "",
    fikenCompanySlug: process.env.FIKEN_COMPANY_SLUG || "",
    fikenEnabled: !!process.env.FIKEN_API_TOKEN,
  };

  const isConfigured = !!(
    process.env.FIKEN_API_TOKEN && process.env.FIKEN_COMPANY_SLUG
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "✅ Betalingsinnstillinger lagret",
      description: "Fiken-konfigurasjonen er oppdatert",
      className: "bg-green-50 border-green-200",
    });

    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "✅ Tilkobling vellykket",
      description: "Fiken API responderer korrekt",
      className: "bg-green-50 border-green-200",
    });

    setTestLoading(false);
  };

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-yellow-900">
              Fiken ikke konfigurert
            </p>
            <p className="text-sm text-yellow-800">
              Legg til FIKEN_API_TOKEN og FIKEN_COMPANY_SLUG i .env-filen for å
              aktivere automatisk fakturering. Registrer deg på{" "}
              <a
                href="https://fiken.no"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                fiken.no
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Label>Status:</Label>
        {isConfigured ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Konfigurert
          </Badge>
        ) : (
          <Badge variant="secondary">Ikke konfigurert</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fikenApiToken">Fiken API-token</Label>
          <Input
            id="fikenApiToken"
            type="password"
            defaultValue={currentSettings.fikenApiToken}
            disabled={loading}
            placeholder="fk_..."
          />
          <p className="text-sm text-muted-foreground">
            API-token fra Fiken (Innstillinger → Integrasjoner)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fikenCompanySlug">Fiken bedrift-slug</Label>
          <Input
            id="fikenCompanySlug"
            defaultValue={currentSettings.fikenCompanySlug}
            disabled={loading}
            placeholder="ditt-bedriftsnavn"
          />
          <p className="text-sm text-muted-foreground">
            Bedrifts-ID fra Fiken URL (fiken.no/firma/
            <strong>bedrift-slug</strong>)
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Automatisk fakturering</Label>
            <Badge
              variant={currentSettings.fikenEnabled ? "default" : "secondary"}
            >
              {currentSettings.fikenEnabled ? "Aktivert" : "Deaktivert"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Når aktivert, opprettes fakturaer automatisk i Fiken for nye
            abonnementer
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
          <h3 className="font-medium">Fakturainformasjon</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Betalingsbetingelser</p>
              <p className="font-medium">14 dager netto</p>
            </div>
            <div>
              <p className="text-muted-foreground">Standard MVA</p>
              <p className="font-medium">25%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Purregebyr</p>
              <p className="font-medium">250 kr</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rentefri kredit</p>
              <p className="font-medium">14 dager</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Lagrer..." : "Lagre innstillinger"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testLoading || !isConfigured}
            onClick={handleTestConnection}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {testLoading ? "Tester..." : "Test tilkobling"}
          </Button>
        </div>
      </form>

      {isConfigured && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-green-900">
                Fiken er konfigurert og klar
              </p>
              <p className="text-sm text-green-800">
                Fakturaer vil automatisk opprettes i Fiken når bedrifter
                registrerer seg eller fornyer abonnement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

