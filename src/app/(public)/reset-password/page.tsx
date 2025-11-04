"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/password-strength";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Ingen gyldig token funnet. Be om en ny reset-lenke.");
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 12) {
      return "Passordet må være minst 12 tegn";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Passordet må inneholde minst én stor bokstav";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Passordet må inneholde minst én liten bokstav";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Passordet må inneholde minst ett tall";
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      return "Passordet må inneholde minst ett spesialtegn (!@#$%^&* etc.)";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Valider passord
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passordene matcher ikke");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "Noe gikk galt. Prøv igjen.");
      }
    } catch (err) {
      setError("Kunne ikke tilbakestille passordet. Prøv igjen.");
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
            <CardTitle className="text-2xl font-bold">
              Passordet er tilbakestilt!
            </CardTitle>
            <CardDescription>
              Du blir automatisk videresendt til påloggingssiden...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Gå til pålogging</Button>
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
          <CardTitle className="text-2xl font-bold">
            Opprett nytt passord
          </CardTitle>
          <CardDescription>
            Velg et sterkt passord for din HMS Nova-konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nytt passord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minst 12 tegn, med stor bokstav, tall og spesialtegn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !token}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft passord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Skriv inn passordet på nytt"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !token}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <PasswordStrengthIndicator password={password} />
            )}

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="mb-2 font-medium">Passordkrav:</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>Minst 12 tegn</li>
                <li>Minst én stor bokstav (A-Z)</li>
                <li>Minst én liten bokstav (a-z)</li>
                <li>Minst ett tall (0-9)</li>
                <li>Minst ett spesialtegn (!@#$%^&*)</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !token}
            >
              {loading ? "Tilbakestiller..." : "Tilbakestill passord"}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Be om en ny lenke
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

