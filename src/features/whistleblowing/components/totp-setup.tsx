"use client";

import { useEffect, useState } from "react";
import { getTotpStatus, startTotpEnrollment, confirmTotpEnrollment, verifyWhistleblowStepUp } from "@/server/actions/totp.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TotpSetup({ onVerified }: { onVerified?: () => void }) {
  const [status, setStatus] = useState<{ enabled: boolean; email: string } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTotpStatus()
      .then((s) => setStatus({ enabled: s.enabled, email: s.email }))
      .catch(() => setStatus({ enabled: false, email: "" }));
  }, []);

  const enroll = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startTotpEnrollment();
      setSecret(result.secret);
      setOtpauthUrl(result.otpauthUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke starte påmelding");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (status?.enabled) {
        await verifyWhistleblowStepUp(code);
      } else {
        await confirmTotpEnrollment(code);
      }
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ugyldig kode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Tofaktor for varsling</CardTitle>
        <CardDescription>
          Varslingssaker krever ekstra bekreftelse. IdP-innlogging erstatter ikke dette steget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.enabled ? (
          <p className="text-sm text-muted-foreground">
            Skriv inn koden fra authenticator-appen for å fortsette.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Aktiver TOTP og lagre nøkkelen i en authenticator-app. Skriv inn nøkkelen manuelt
              eller åpne otpauth-lenken på mobil.
            </p>
            {!secret && (
              <Button onClick={enroll} disabled={busy}>
                Generer nøkkel
              </Button>
            )}
            {secret && (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Hemmelig nøkkel</p>
                <p className="break-all font-mono text-xs">{secret}</p>
                {otpauthUrl && (
                  <a href={otpauthUrl} className="text-xs underline">
                    Åpne i authenticator
                  </a>
                )}
              </div>
            )}
          </>
        )}
        {(status?.enabled || secret) && (
          <div className="space-y-2">
            <Label htmlFor="totp">6-sifret kode</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
            <Button onClick={confirm} disabled={busy || code.length !== 6}>
              Bekreft
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
