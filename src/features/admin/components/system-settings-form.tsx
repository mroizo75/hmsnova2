"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw } from "lucide-react";

export function SystemSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const currentSettings = {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "HMS Nova",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    supportEmail: "support@hmsnova.com",
    maxUsersPerTenant: "100",
    sessionTimeout: "30",
    enableRegistration: false,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Simuler lagring
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "⚙️ Innstillinger lagret",
      description: "Systeminnstillingene er oppdatert",
      className: "bg-green-50 border-green-200",
    });

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="appName">Applikasjonsnavn</Label>
        <Input
          id="appName"
          defaultValue={currentSettings.appName}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Navnet som vises i applikasjonen
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appUrl">Applikasjons-URL</Label>
        <Input
          id="appUrl"
          type="url"
          defaultValue={currentSettings.appUrl}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Brukes i e-poster og eksterne lenker
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportEmail">Support e-post</Label>
        <Input
          id="supportEmail"
          type="email"
          defaultValue={currentSettings.supportEmail}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          E-post for kundesupport
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxUsers">Maks brukere per tenant</Label>
        <Input
          id="maxUsers"
          type="number"
          defaultValue={currentSettings.maxUsersPerTenant}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Standard grense for nye tenants
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sessionTimeout">Sesjon timeout (minutter)</Label>
        <Input
          id="sessionTimeout"
          type="number"
          defaultValue={currentSettings.sessionTimeout}
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Automatisk utlogging etter inaktivitet
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Selvregistrering</Label>
          <p className="text-sm text-muted-foreground">
            Tillat nye bedrifter å registrere seg selv
          </p>
        </div>
        <Button
          type="button"
          variant={currentSettings.enableRegistration ? "default" : "outline"}
          size="sm"
          disabled={loading}
        >
          {currentSettings.enableRegistration ? "Aktivert" : "Deaktivert"}
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Lagrer..." : "Lagre endringer"}
        </Button>
        <Button type="button" variant="outline" disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tilbakestill
        </Button>
      </div>
    </form>
  );
}

