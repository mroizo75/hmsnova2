"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useTranslations } from "next-intl";

export function IsoCompetenceInfo() {
  const t = useTranslations("dashboardTrainingPage");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-blue-50/60 border-blue-200">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {t("iso.title")}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-blue-700" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-700" />
          )}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="text-sm text-blue-800 space-y-2 pt-0">
          <p className="text-xs text-blue-700 mb-3">{t("iso.description")}</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="font-semibold text-xs mb-0.5">{t("iso.points.a.title")}</p>
              <p className="text-xs">{t("iso.points.a.description")}</p>
            </div>
            <div>
              <p className="font-semibold text-xs mb-0.5">{t("iso.points.b.title")}</p>
              <p className="text-xs">{t("iso.points.b.description")}</p>
            </div>
            <div>
              <p className="font-semibold text-xs mb-0.5">{t("iso.points.c.title")}</p>
              <p className="text-xs">{t("iso.points.c.description")}</p>
            </div>
            <div>
              <p className="font-semibold text-xs mb-0.5">{t("iso.points.d.title")}</p>
              <p className="text-xs">{t("iso.points.d.description")}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
