"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { UserGapResult } from "@/server/queries/competence.queries";

interface GapAnalysisUserProps {
  gap: UserGapResult;
  backUrl?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  FULFILLED: {
    label: "Oppfylt",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    color: "text-green-700",
  },
  EXPIRED: {
    label: "Utløpt",
    icon: <Clock className="h-4 w-4 text-amber-600" />,
    color: "text-amber-700",
  },
  MISSING: {
    label: "Mangler",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
    color: "text-red-700",
  },
};

export function GapAnalysisUser({ gap, backUrl = "/dashboard/training/gap" }: GapAnalysisUserProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{gap.userName ?? gap.userEmail}</h1>
          {gap.department && (
            <p className="text-muted-foreground text-sm">{gap.department}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{gap.gapPercent}%</p>
            <p className="text-xs text-muted-foreground">Oppfyllelse</p>
            <Progress value={gap.gapPercent} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{gap.fulfilled}</p>
            <p className="text-xs text-muted-foreground">Oppfylt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{gap.expired}</p>
            <p className="text-xs text-muted-foreground">Utløpt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-600">{gap.missing}</p>
            <p className="text-xs text-muted-foreground">Mangler</p>
          </CardContent>
        </Card>
      </div>

      {gap.profiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Profiler:</span>
          {gap.profiles.map((p) => (
            <Badge key={p.id} variant="outline">{p.name}</Badge>
          ))}
        </div>
      )}

      {gap.criticalMissing.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Lovpålagte mangler ({gap.criticalMissing.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {gap.criticalMissing.map((item) => (
                <div key={item.courseKey} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{item.courseTitle}</span>
                  <Badge variant="destructive">{item.legalRef}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Alle krav ({gap.totalRequirements})</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {gap.items.map((item) => {
              const config = STATUS_CONFIG[item.status];
              return (
                <div key={item.courseKey} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <div>
                      <span className="text-sm font-medium">{item.courseTitle}</span>
                      {item.legalRef && (
                        <Badge variant="outline" className="ml-2 text-xs">{item.legalRef}</Badge>
                      )}
                      {item.validUntil && (
                        <span className="text-xs text-muted-foreground ml-2">
                          Gyldig til: {new Date(item.validUntil).toLocaleDateString("nb-NO")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={item.status === "FULFILLED" ? "default" : item.status === "EXPIRED" ? "secondary" : "destructive"}
                  >
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
