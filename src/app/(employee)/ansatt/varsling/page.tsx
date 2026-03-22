import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Lock, AlertCircle, ExternalLink, MessageSquare, Eye } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AnsattVarslingPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeWhistleblowingPage");

  if (!session?.user) {
    redirect("/login");
  }

  // Hent tenant info for å vise unik varslingslenke
  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const tenantSlug = userTenant?.tenant?.slug || "";
  const tenantName = userTenant?.tenant?.name || t("tenantFallback");
  const whistleblowUrl = tenantSlug 
    ? `${process.env.NEXT_PUBLIC_URL || "https://hmsnova.no"}/varsling/${tenantSlug}`
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-2 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">{t("hero.title")}</h1>
        <p className="text-gray-600">
          {t("hero.description")}
        </p>
      </div>

      {/* Viktig info */}
      <Alert className="border-primary/50 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>{t("confidential.title")}</AlertTitle>
        <AlertDescription>
          {t("confidential.description")}
        </AlertDescription>
      </Alert>

      {/* Hva kan varsles om */}
      <Card>
        <CardHeader>
          <CardTitle>{t("whatToReport.title")}</CardTitle>
          <CardDescription>
            {t("whatToReport.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium">{t("whatToReport.items.harassment.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("whatToReport.items.harassment.description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Shield className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium">{t("whatToReport.items.hse.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("whatToReport.items.hse.description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Lock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium">{t("whatToReport.items.corruption.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("whatToReport.items.corruption.description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">{t("whatToReport.items.ethics.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("whatToReport.items.ethics.description")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hvordan fungerer det */}
      <Card>
        <CardHeader>
          <CardTitle>{t("howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </span>
              <div className="pt-1">
                <h4 className="font-medium">{t("howItWorks.step1.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("howItWorks.step1.description")}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </span>
              <div className="pt-1">
                <h4 className="font-medium">{t("howItWorks.step2.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("howItWorks.step2.description")}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </span>
              <div className="pt-1">
                <h4 className="font-medium">{t("howItWorks.step3.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("howItWorks.step3.description")}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                4
              </span>
              <div className="pt-1">
                <h4 className="font-medium">{t("howItWorks.step4.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("howItWorks.step4.description")}
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Din bedrifts varslingslenke */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("tenantChannel.title", { tenantName })}
          </CardTitle>
          <CardDescription className="text-green-700">
            {t("tenantChannel.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-white border-green-300">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">{t("tenantChannel.alertTitle", { tenantName })}</AlertTitle>
            <AlertDescription className="text-green-800">
              {t("tenantChannel.alertDescriptionPrefix")} <strong>{t("tenantChannel.only")}</strong>{" "}
              {t("tenantChannel.alertDescriptionSuffix")}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-white p-4 border border-green-200">
            <p className="text-sm text-muted-foreground mb-2">{t("tenantChannel.linkLabel")}</p>
            <p className="text-lg font-mono font-bold text-green-900 break-all">{whistleblowUrl}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-xs font-medium text-green-900 mb-2">{t("tenantChannel.howTitle")}</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>{t("tenantChannel.points.p1", { tenantName })}</li>
              <li>{t("tenantChannel.points.p2", { tenantName })}</li>
              <li>{t("tenantChannel.points.p3")}</li>
              <li>{t("tenantChannel.points.p4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Handlinger */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">{t("actions.new.title")}</CardTitle>
            <CardDescription>
              {t("actions.new.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {whistleblowUrl ? (
              <Button asChild className="w-full" size="lg">
                <Link href={whistleblowUrl} target="_blank">
                  {t("actions.new.button")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("actions.new.unavailable")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("actions.track.title")}</CardTitle>
            <CardDescription>
              {t("actions.track.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/varsling/spor" target="_blank">
                {t("actions.track.button")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Juridisk beskyttelse */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>{t("legal.title")}</AlertTitle>
        <AlertDescription>
          {t("legal.descriptionPrefix")}{" "}
          <a
            href="https://www.arbeidstilsynet.no/tema/varsling/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            {t("legal.linkText")}
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}

