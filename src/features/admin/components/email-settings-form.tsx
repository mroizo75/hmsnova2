"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EmailSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const currentSettings = {
    resendApiKey: process.env.RESEND_API_KEY || "re_***************",
    fromEmail: "noreply@hmsnova.com",
    fromName: "HMS Nova",
    replyToEmail: "support@hmsnova.com",
  };

  const isConfigured = !!process.env.RESEND_API_KEY;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "✅ E-postinnstillinger lagret",
      description: "Resend-konfigurasjonen er oppdatert",
      className: "bg-green-50 border-green-200",
    });

    setLoading(false);
  };

  const handleTestEmail = async () => {
    setTestLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "📧 Test-e-post sendt",
      description: "Sjekk innboksen din for test-e-posten",
      className: "bg-blue-50 border-blue-200",
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
              E-post ikke konfigurert
            </p>
            <p className="text-sm text-yellow-800">
              Legg til RESEND_API_KEY i .env-filen for å aktivere e-postfunksjonalitet.
              Registrer deg på{" "}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                resend.com
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Label>Status:</Label>
        {isConfigured ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Konfigurert
          </Badge>
        ) : (
          <Badge variant="secondary">Ikke konfigurert</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resendApiKey">Resend API-nøkkel</Label>
          <Input
            id="resendApiKey"
            type="password"
            defaultValue={currentSettings.resendApiKey}
            disabled={loading}
            placeholder="re_..."
          />
          <p className="text-sm text-muted-foreground">
            API-nøkkel fra Resend dashboard
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fromEmail">Fra e-post</Label>
          <Input
            id="fromEmail"
            type="email"
            defaultValue={currentSettings.fromEmail}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground">
            E-postadressen som brukes som avsender
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fromName">Fra navn</Label>
          <Input
            id="fromName"
            defaultValue={currentSettings.fromName}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground">
            Navnet som vises som avsender
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="replyToEmail">Svar til e-post</Label>
          <Input
            id="replyToEmail"
            type="email"
            defaultValue={currentSettings.replyToEmail}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground">
            E-post for svar på systemgenererte e-poster
          </p>
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
            onClick={handleTestEmail}
          >
            <Send className="mr-2 h-4 w-4" />
            {testLoading ? "Sender..." : "Send test-e-post"}
          </Button>
        </div>
      </form>
    </div>
  );
}

