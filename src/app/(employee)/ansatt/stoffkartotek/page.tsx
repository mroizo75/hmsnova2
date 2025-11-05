import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Download, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function AnsattStoffkartotek() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const chemicals = await prisma.chemical.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "ACTIVE",
    },
    orderBy: {
      productName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Beaker className="h-7 w-7 text-purple-600" />
          Stoffkartotek
        </h1>
        <p className="text-muted-foreground">
          Oversikt over farlige stoffer og kjemikalier
        </p>
      </div>

      {/* Varsel */}
      <Card className="border-l-4 border-l-orange-500 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-orange-900">
            <strong>⚠️ Viktig:</strong> Les alltid sikkerhetsdatabladet (SDS) før bruk!
            Bruk alltid anbefalt verneutstyr.
          </p>
        </CardContent>
      </Card>

      {/* Stoffliste */}
      <div className="space-y-3">
        {chemicals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Ingen kjemikalier registrert ennå
              </p>
            </CardContent>
          </Card>
        ) : (
          chemicals.map((chemical) => (
            <Link key={chemical.id} href={`/ansatt/stoffkartotek/${chemical.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-14 w-14 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Beaker className="h-7 w-7 text-purple-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate">
                        {chemical.productName}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                        {chemical.supplier && (
                          <span>Leverandør: {chemical.supplier}</span>
                        )}
                        {chemical.casNumber && (
                          <Badge variant="outline" className="text-xs">
                            CAS: {chemical.casNumber}
                          </Badge>
                        )}
                      </div>

                      {/* Faresymboler */}
                      {chemical.warningPictograms && (() => {
                        try {
                          const pictograms = JSON.parse(chemical.warningPictograms);
                          return Array.isArray(pictograms) && pictograms.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {pictograms.slice(0, 4).map((pic: string, idx: number) => (
                                <div key={idx} className="h-8 w-8 relative">
                                  <Image
                                    src={`/faremerker/${pic}`}
                                    alt="Farepiktogram"
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              ))}
                              {pictograms.length > 4 && (
                                <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs">
                                  +{pictograms.length - 4}
                                </div>
                              )}
                            </div>
                          ) : null;
                        } catch {
                          return null;
                        }
                      })()}

                      {/* PPE */}
                      {chemical.requiredPPE && (() => {
                        try {
                          const ppe = JSON.parse(chemical.requiredPPE);
                          return Array.isArray(ppe) && ppe.length > 0 ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Verneutstyr:</span>
                              <div className="flex gap-1">
                                {ppe.slice(0, 3).map((ppeItem: string, idx: number) => (
                                  <div key={idx} className="h-6 w-6 relative">
                                    <Image
                                      src={`/ppe/${ppeItem}`}
                                      alt="PPE"
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
                    </div>

                    {/* SDS nedlasting */}
                    {chemical.sdsKey && (
                      <div className="flex flex-col gap-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Download className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">SDS</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Info */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4 space-y-2 text-sm">
          <p className="font-semibold text-blue-900">
            💡 Hva betyr symbolene?
          </p>
          <ul className="space-y-1 text-blue-800 text-xs">
            <li>🔴 Farlig for helse (giftig, kreftfremkallende)</li>
            <li>🟠 Brannfarlig</li>
            <li>⚫ Etsende (kan brenne hud)</li>
            <li>🔵 Farlig for miljøet</li>
          </ul>
          <p className="text-blue-800 text-xs pt-2">
            Ved usikkerhet, kontakt HMS-ansvarlig før bruk!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

