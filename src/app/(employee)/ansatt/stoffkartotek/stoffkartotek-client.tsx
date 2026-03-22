"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beaker, Download, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { normalizePpeFile } from "@/lib/pictograms";
import { SafetySymbolsDialog } from "@/components/safety-symbols-dialog";
import { IsocyanateBadge } from "@/components/isocyanate-warning";
import type { Chemical } from "@prisma/client";

interface StoffkartotekClientProps {
  chemicals: Chemical[];
}

export function StoffkartotekClient({ chemicals }: StoffkartotekClientProps) {
  const t = useTranslations("employeeChemicalsPage");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrer kjemikalier basert på søk
  const filteredChemicals = useMemo(() => {
    if (!searchTerm.trim()) return chemicals;

    const lowerSearch = searchTerm.toLowerCase();
    return chemicals.filter(
      (chemical) =>
        chemical.productName.toLowerCase().includes(lowerSearch) ||
        chemical.supplier?.toLowerCase().includes(lowerSearch) ||
        chemical.casNumber?.toLowerCase().includes(lowerSearch)
    );
  }, [chemicals, searchTerm]);

  return (
    <>
      {/* Søkefelt og dialog-knapp */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <SafetySymbolsDialog />
      </div>

      {/* Resultatstatistikk */}
      {searchTerm && (
        <p className="text-sm text-muted-foreground">
          {t("showingCount", { filtered: filteredChemicals.length, total: chemicals.length })}
        </p>
      )}

      {/* Stoffliste */}
      <div className="space-y-3">
        {filteredChemicals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? t("emptySearch") : t("emptyAll")}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredChemicals.map((chemical) => (
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {chemical.productName}
                        </h3>
                        {chemical.containsIsocyanates && <IsocyanateBadge />}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        {chemical.supplier && (
                          <span>{t("labels.supplier", { supplier: chemical.supplier })}</span>
                        )}
                        {chemical.casNumber && (
                          <Badge variant="outline" className="text-xs">
                            CAS: {chemical.casNumber}
                          </Badge>
                        )}
                      </div>

                      {/* H-setninger */}
                      {chemical.hazardStatements && (
                        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
                          <p className="text-xs font-medium text-orange-900 mb-1">{t("labels.hStatements")}</p>
                          <p className="text-xs text-orange-800 line-clamp-2">
                            {chemical.hazardStatements}
                          </p>
                        </div>
                      )}

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
                                    alt={t("labels.hazardPictogramAlt")}
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

                      {/* Notater (synlig for ansatte i listen) */}
                      {chemical.notes && (
                        <div className="mb-2 p-2 bg-muted/50 rounded text-xs">
                          <span className="font-medium text-muted-foreground">{t("labels.notes")} </span>
                          <span className="line-clamp-2">{chemical.notes}</span>
                        </div>
                      )}

                      {/* PPE */}
                      {chemical.requiredPPE && (() => {
                        try {
                          const ppe = JSON.parse(chemical.requiredPPE);
                          return Array.isArray(ppe) && ppe.length > 0 ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">{t("labels.ppe")}</span>
                              <div className="flex gap-1">
                                {ppe.slice(0, 3).map((ppeItem: string, idx: number) => {
                                  const normalizedFile = normalizePpeFile(ppeItem);
                                  if (!normalizedFile) return null;
                                  return (
                                    <div key={idx} className="h-6 w-6 relative">
                                      <Image
                                        src={`/ppe/${normalizedFile}`}
                                        alt={t("labels.ppeAlt")}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                      />
                                    </div>
                                  );
                                })}
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
                        <span className="text-xs text-muted-foreground">{t("labels.sds")}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
