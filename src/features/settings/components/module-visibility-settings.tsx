"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  updateModuleVisibility,
} from "@/server/actions/settings.actions";
import {
  MODULE_DEFAULTS,
  MODULE_LABELS,
  type ModuleKey,
  type ModuleVisibilityConfig,
} from "@/lib/module-visibility";
import { getRoleDisplayName } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { Lock, RotateCcw, Save, Info, Eye, EyeOff, Send } from "lucide-react";

interface ModuleVisibilitySettingsProps {
  initialConfig: ModuleVisibilityConfig | null;
  isAdmin: boolean;
}

const ALL_MODULES = Object.keys(MODULE_DEFAULTS) as ModuleKey[];

const ROLES_IN_ORDER: Role[] = ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"];

// Moduler der ansatte alltid kan sende inn, selv om de ikke ser andres data
const SUBMIT_ONLY_MODULES = new Set<ModuleKey>(["incidents", "ruh", "sja", "forms"]);

export function ModuleVisibilitySettings({
  initialConfig,
  isAdmin,
}: ModuleVisibilitySettingsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState<Record<ModuleKey, Set<Role>>>(() => {
    const result = {} as Record<ModuleKey, Set<Role>>;
    for (const mod of ALL_MODULES) {
      const roles = initialConfig?.[mod] ?? MODULE_DEFAULTS[mod];
      const withAdmin = roles.includes("ADMIN") ? roles : ["ADMIN" as Role, ...roles];
      result[mod] = new Set(withAdmin);
    }
    return result;
  });

  const [loading, setLoading] = useState(false);

  const toggle = (mod: ModuleKey, role: Role) => {
    if (role === "ADMIN") return; // ADMIN kan aldri fjernes
    setConfig((prev) => {
      const next = { ...prev };
      const set = new Set(prev[mod]);
      if (set.has(role)) {
        set.delete(role);
      } else {
        set.add(role);
      }
      next[mod] = set;
      return next;
    });
  };

  const resetToDefault = () => {
    const result = {} as Record<ModuleKey, Set<Role>>;
    for (const mod of ALL_MODULES) {
      result[mod] = new Set(MODULE_DEFAULTS[mod]);
    }
    setConfig(result);
  };

  const handleSave = async () => {
    setLoading(true);
    const serialized: Record<string, string[]> = {};
    for (const mod of ALL_MODULES) {
      serialized[mod] = Array.from(config[mod]);
    }
    const result = await updateModuleVisibility(serialized);
    setLoading(false);
    if (result.success) {
      toast({
        title: "Modul-synlighet oppdatert",
        description: "Innstillingene er lagret. Brukere vil se endringen neste gang de laster siden.",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: result.error,
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Kun administratorer kan konfigurere modul-synlighet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Hvem kan se og behandle innsendte data?
          </CardTitle>
          <CardDescription>
            Velg hvilke roller som kan <strong>lese og behandle</strong> innsendt data i hvert modul.
            Roller som ikke er huket av vil ikke se andres innsendte data. ADMIN har alltid full tilgang.
            Endringer logges i revisjonssporet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Forklaringsbokser */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 p-3 flex gap-2.5 text-sm text-green-900 dark:text-green-100">
              <Send className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold">Innsending er alltid åpen</p>
                <p className="text-xs mt-0.5 text-green-800 dark:text-green-200">
                  Alle ansatte kan fortsatt sende inn avvik, RUH, SJA og skjemaer – uavhengig av hvem som kan se dem.
                </p>
              </div>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2.5 text-sm text-blue-900 dark:text-blue-100">
              <Eye className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold">Hvem ser og behandler?</p>
                <p className="text-xs mt-0.5 text-blue-800 dark:text-blue-200">
                  Kun valgte roller ser andres innsendte data, kan undersøke avvik, godkjenne SJA osv. Varsler sendes kun til roller med tilgang.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-sm text-amber-900 dark:text-amber-100">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Eksempel:</strong> Hvis kun <em>Admin</em> og <em>HMS-ansvarlig</em> er valgt for «Avvik», kan Leder og andre
              ikke se, undersøke eller lukke avvik – selv om ansatte fremdeles kan rapportere dem.
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium w-56">Modul</th>
                  {ROLES_IN_ORDER.map((role) => (
                    <th key={role} className="text-center py-3 px-2 font-medium min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{getRoleDisplayName(role)}</span>
                        {role === "ADMIN" && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Alltid
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod, idx) => {
                  const checkedCount = ROLES_IN_ORDER.filter(r => config[mod].has(r)).length;
                  const isRestricted = checkedCount < ROLES_IN_ORDER.length;
                  return (
                    <tr
                      key={mod}
                      className={`${idx % 2 === 0 ? "bg-muted/20" : ""} ${isRestricted ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="py-3 px-4 font-medium text-sm">
                        <div className="flex items-center gap-2">
                          {isRestricted ? (
                            <EyeOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span>{MODULE_LABELS[mod]}</span>
                          {SUBMIT_ONLY_MODULES.has(mod) && isRestricted && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-700 border-green-300 ml-1">
                              Innsending åpen
                            </Badge>
                          )}
                        </div>
                      </td>
                      {ROLES_IN_ORDER.map((role) => {
                        const isChecked = config[mod].has(role);
                        const isLocked = role === "ADMIN";
                        return (
                          <td key={role} className="text-center py-3 px-2">
                            <Checkbox
                              checked={isChecked}
                              disabled={isLocked}
                              onCheckedChange={() => toggle(mod, role)}
                              className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Lagrer..." : "Lagre innstillinger"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading} className="bg-transparent">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Tilbakestill til standard
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tilbakestille tilgangsinnstillinger?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette setter alle moduler tilbake til systemets standardtilgang.
                    Eventuelle begrensninger du har satt fjernes i skjemaet.
                    Du må trykke «Lagre innstillinger» etterpå for at endringen skal tre i kraft.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={resetToDefault}>
                    Tilbakestill
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground ml-auto">
              Endringer trer i kraft umiddelbart for nye sideinnlastinger.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
