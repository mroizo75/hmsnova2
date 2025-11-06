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

export default async function AnsattChemicalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const chemical = await prisma.chemical.findUnique({
    where: {
      id,
      tenantId: session.user.tenantId,
      status: "ACTIVE", // Kun aktive kjemikalier for ansatte
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
            Tilbake til stoffkartotek
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
                <p className="text-muted-foreground">Leverandør: {chemical.supplier}</p>
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
                <p className="font-medium text-red-900">⚠️ Varsel</p>
                <p className="text-sm text-red-800">
                  Dette kjemikaliet har forfalt revisjonsdato. Kontakt HMS-ansvarlig før bruk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sikkerhetsdatablad - Prioritert øverst for ansatte */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Sikkerhetsdatablad (SDS)
          </CardTitle>
          <CardDescription>Les alltid sikkerhetsdatabladet før bruk!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {chemical.sdsVersion && (
              <div>
                <p className="text-sm text-muted-foreground">Versjon</p>
                <p className="font-medium">{chemical.sdsVersion}</p>
              </div>
            )}

            {chemical.sdsDate && (
              <div>
                <p className="text-sm text-muted-foreground">Dato</p>
                <p className="font-medium">
                  {new Date(chemical.sdsDate).toLocaleDateString("nb-NO")}
                </p>
              </div>
            )}

            {chemical.nextReviewDate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Neste revisjon
                </p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {new Date(chemical.nextReviewDate).toLocaleDateString("nb-NO")}
                  {isOverdue && " (Forfalt!)"}
                </p>
              </div>
            )}
          </div>

          {chemical.sdsKey ? (
            <div>
              <Link href={`/api/chemicals/${chemical.id}/download-sds`} target="_blank">
                <Button size="lg" className="w-full md:w-auto">
                  <Download className="mr-2 h-5 w-5" />
                  Last ned sikkerhetsdatablad (PDF)
                </Button>
              </Link>
            </div>
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800">
                  ⚠️ Sikkerhetsdatablad mangler - kontakt HMS-ansvarlig
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
            <CardTitle>Produktinformasjon</CardTitle>
            <CardDescription>Detaljer om produktet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.casNumber && (
              <div>
                <p className="text-sm text-muted-foreground">CAS-nummer</p>
                <p className="font-medium">{chemical.casNumber}</p>
              </div>
            )}

            {chemical.hazardClass && (
              <div>
                <p className="text-sm text-muted-foreground">Fareklasse (GHS)</p>
                <p className="font-medium">{chemical.hazardClass}</p>
              </div>
            )}

            {chemical.location && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Lagringssted
                </p>
                <p className="font-medium">{chemical.location}</p>
              </div>
            )}

            {chemical.quantity && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Mengde
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
            <CardTitle>Faremarkering</CardTitle>
            <CardDescription>GHS/CLP-klassifisering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.hazardStatements && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">H-setninger (Faresetninger)</p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="font-medium text-sm whitespace-pre-wrap text-orange-900">
                    {chemical.hazardStatements}
                  </p>
                </div>
              </div>
            )}

            {chemical.warningPictograms && (() => {
              try {
                const pictograms = JSON.parse(chemical.warningPictograms);
                return pictograms.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Faresymboler</p>
                    <div className="flex flex-wrap gap-3">
                      {pictograms.map((file: string, idx: number) => (
                        <div key={idx} className="relative w-20 h-20 border-2 border-orange-200 rounded-lg p-1 bg-white">
                          <Image
                            src={`/faremerker/${file}`}
                            alt="Faresymbol"
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
                  🛡️ Påkrevd personlig verneutstyr (PPE)
                </CardTitle>
                <CardDescription className="text-green-700">
                  Dette verneutstyret MÅ benyttes ved bruk av dette produktet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {ppeList.map((file: string, idx: number) => (
                    <div key={idx} className="relative w-20 h-20 border-2 border-green-300 rounded-lg p-2 bg-white">
                      <Image
                        src={`/ppe/${file}`}
                        alt="PPE-krav"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null;
        } catch {
          return null;
        }
      })()}

      {/* Notater */}
      {chemical.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Viktig informasjon</CardTitle>
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
            <strong>💡 Husk:</strong> Ved usikkerhet eller spørsmål, kontakt HMS-ansvarlig før bruk.
            Les alltid sikkerhetsdatabladet grundig!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

