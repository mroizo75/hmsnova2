"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Noe gikk galt. Prøv igjen.");
      }
    } catch (err) {
      setError("Kunne ikke sende forespørsel. Sjekk internettforbindelsen.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Sjekk e-posten din</CardTitle>
            <CardDescription>
              Hvis e-postadressen er registrert i systemet, har vi sendt deg en
              lenke for å tilbakestille passordet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="mb-2 font-medium">Neste steg:</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>Sjekk innboksen din</li>
                <li>Klikk på lenken i e-posten</li>
                <li>Opprett et nytt passord</li>
              </ul>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Lenken utløper om 1 time av sikkerhetsgrunner.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til pålogging
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Glemt passord?</CardTitle>
          <CardDescription>
            Oppgi e-postadressen din, så sender vi deg en lenke for å
            tilbakestille passordet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-postadresse</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sender..." : "Send tilbakestillingslenke"}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 inline h-3 w-3" />
                Tilbake til pålogging
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
            <p className="mb-2 font-medium">Sikkerhetstips:</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Lenken utløper etter 1 time</li>
              <li>Hver lenke kan bare brukes én gang</li>
              <li>Hvis du ikke ba om dette, ignorer e-posten</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

