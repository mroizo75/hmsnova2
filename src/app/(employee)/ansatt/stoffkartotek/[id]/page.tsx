import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertTriangle, Calendar, MapPin, Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { normalizePpeFile } from "@/lib/pictograms";
import { IsocyanateWarning } from "@/components/isocyanate-warning";
import { getLocale, getTranslations } from "next-intl/server";

export default async function AnsattChemicalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeChemicalDetailPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const chemical = await prisma.chemical.findUnique({
    where: {
      id,
      tenantId: session.user.tenantId,
      status: "ACTIVE",
    },
  });

  if (!chemical) {
    notFound();
  }

  const isOverdue = chemical.nextReviewDate && new Date(chemical.nextReviewDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/ansatt/stoffkartotek">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
        </Link>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{chemical.productName}</h1>
              {chemical.supplier && (
                <p className="text-muted-foreground">{t("supplier", { name: chemical.supplier })}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Varsel om forfalt revisjon */}
      {isOverdue && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">{t("overdue.title")}</p>
                <p className="text-sm text-red-800">
                  {t("overdue.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Varsel om diisocyanater - VIKTIG for ansatte! */}
      {chemical.containsIsocyanates && (
        <IsocyanateWarning details={chemical.aiExtractedData ? (() => {
          try {
            const data = JSON.parse(chemical.aiExtractedData);
            return data.isocyanateDetails;
          } catch {
            return undefined;
          }
        })() : undefined} />
      )}

      {/* Sikkerhetsdatablad - Prioritert øverst for ansatte */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            {t("sds.title")}
          </CardTitle>
          <CardDescription>{t("sds.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {chemical.sdsVersion && (
              <div>
                <p className="text-sm text-muted-foreground">{t("sds.version")}</p>
                <p className="font-medium">{chemical.sdsVersion}</p>
              </div>
            )}

            {chemical.sdsDate && (
              <div>
                <p className="text-sm text-muted-foreground">{t("sds.date")}</p>
                <p className="font-medium">
                  {new Date(chemical.sdsDate).toLocaleDateString(dateLocale)}
                </p>
              </div>
            )}

            {chemical.nextReviewDate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("sds.nextReview")}
                </p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {new Date(chemical.nextReviewDate).toLocaleDateString(dateLocale)}
                  {isOverdue && ` (${t("sds.overdueBadge")})`}
                </p>
              </div>
            )}
          </div>

          {chemical.sdsKey ? (
            <div>
              <Link href={`/api/chemicals/${chemical.id}/download-sds`} target="_blank">
                <Button size="lg" className="w-full md:w-auto">
                  <Download className="mr-2 h-5 w-5" />
                  {t("sds.download")}
                </Button>
              </Link>
            </div>
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800">
                  {t("sds.missing")}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Produktinformasjon */}
        <Card>
          <CardHeader>
            <CardTitle>{t("product.title")}</CardTitle>
            <CardDescription>{t("product.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.casNumber && (
              <div>
                <p className="text-sm text-muted-foreground">{t("product.cas")}</p>
                <p className="font-medium">{chemical.casNumber}</p>
              </div>
            )}


            {chemical.location && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("product.location")}
                </p>
                <p className="font-medium">{chemical.location}</p>
              </div>
            )}

            {chemical.quantity && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t("product.quantity")}
                </p>
                <p className="font-medium">
                  {chemical.quantity} {chemical.unit || ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faremarkering */}
        <Card>
          <CardHeader>
            <CardTitle>{t("hazard.title")}</CardTitle>
            <CardDescription>{t("hazard.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.hazardStatements && (
              <div>
                <p className="text-sm text-muted-foreground">{t("hazard.hStatements")}</p>
                <p className="font-medium text-sm whitespace-pre-wrap">
                  {chemical.hazardStatements}
                </p>
              </div>
            )}

            {chemical.warningPictograms && (() => {
              try {
                const pictograms = JSON.parse(chemical.warningPictograms);
                return pictograms.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">{t("hazard.pictograms")}</p>
                    <div className="flex flex-wrap gap-3">
                      {pictograms.map((file: string, idx: number) => (
                        <div key={idx} className="relative w-20 h-20 border-2 border-orange-200 rounded-lg p-1 bg-white">
                          <Image
                            src={`/faremerker/${file}`}
                            alt={t("hazard.pictogramAlt")}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              } catch {
                return null;
              }
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Personlig verneutstyr - VIKTIG for ansatte! */}
      {chemical.requiredPPE && (() => {
        try {
          const ppeList = JSON.parse(chemical.requiredPPE);
          return ppeList.length > 0 ? (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">
                  {t("ppe.title")}
                </CardTitle>
                <CardDescription className="text-green-700">
                  {t("ppe.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {ppeList.map((file: string, idx: number) => {
                    const normalizedFile = normalizePpeFile(file);
                    if (!normalizedFile) return null;
                    return (
                      <div key={idx} className="relative w-20 h-20 border-2 border-green-300 rounded-lg p-2 bg-white">
                        <Image
                          src={`/ppe/${normalizedFile}`}
                          alt={t("ppe.alt")}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null;
        } catch {
          return null;
        }
      })()}

      {/* Tilleggsinfo – Notater (synlig for ansatte) */}
      {chemical.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes.title")}</CardTitle>
            <CardDescription>{t("notes.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{chemical.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Sikkerhetsinfo */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("tip.title")}</strong> {t("tip.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

