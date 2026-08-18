"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Microsoft-kontoen din er ikke koblet til en bedrift med aktiv SSO i HMS Nova. Kontakt administratoren din.",
  OAuthAccountNotLinked:
    "Det finnes allerede en HMS Nova-bruker med denne e-postadressen. Logg inn med e-post og passord, eller kontakt support@hmsnova.no.",
  OAuthSignin: "Kunne ikke starte innlogging med Microsoft. Kontakt support@hmsnova.no.",
  OAuthCallback:
    "Microsoft avviste innloggingen. Som regel betyr det at IT-ansvarlig hos dere ikke har godkjent HMS Nova ennå — be dem godkjenne appen under Innstillinger → Office 365.",
  Configuration: "Microsoft-innlogging er ikke ferdig konfigurert. Kontakt support@hmsnova.no.",
};

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  // Sjekk for status-meldinger fra URL (verifisering og feil fra NextAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get("verified") === "true";
    const errorCode = params.get("error");

    if (isVerified) {
      setVerified(true);
    }

    if (errorCode) {
      setError(
        AUTH_ERROR_MESSAGES[errorCode] ??
          "Innloggingen feilet. Prøv igjen, eller kontakt support@hmsnova.no."
      );
    }

    if (isVerified || errorCode) {
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ugyldig e-post eller passord");
      } else {
        const response = await fetch("/api/auth/session");
        const session = await response.json();
        if (session?.user?.isSuperAdmin || session?.user?.isSupport) {
          router.push("/admin");
        } else if (session?.user?.role === "ANSATT") {
          router.push("/ansatt");
        } else if (session?.user?.isTavleOnly) {
          router.push("/dashboard/hms-tavle");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (error) {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {/* <CardTitle className="text-2xl font-bold">HMS Nova logg inn</CardTitle> */}
          <Image src="/logo-nova.png" alt="HMS Nova" width={150} height={150} className="mx-auto" />
          <CardDescription className="text-center text-xl md:text-lg">
            Logg inn med din e-post og passord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {verified && (
              <div className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
                ✓ E-postadressen din er verifisert! Du kan nå logge inn.
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("auth.login")}
            </Button>

            {/* SSO Options */}
            {process.env.NEXT_PUBLIC_ENABLE_SSO === "true" && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Eller
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 23 23"
                  >
                    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Logg inn med Microsoft
                </Button>
              </>
            )}

            <div className="text-center mt-4">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Glemt passord?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

