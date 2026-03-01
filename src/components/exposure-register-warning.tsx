import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { detectCmrClassifications } from "@/lib/cmr-detection";

interface Props {
  chemicalId: string;
  chemicalName: string;
  hazardStatements: string | null | undefined;
  isCMR: boolean;
  existingEntryCount?: number;
}

export function ExposureRegisterWarning({
  chemicalId,
  chemicalName,
  hazardStatements,
  isCMR,
  existingEntryCount = 0,
}: Props) {
  const classifications = detectCmrClassifications(hazardStatements, isCMR);
  if (classifications.length === 0) return null;

  const hasEntries = existingEntryCount > 0;

  return (
    <Card className={`border-2 ${hasEntries ? "bg-amber-50 border-amber-300" : "bg-red-50 border-red-300"}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${hasEntries ? "text-amber-600" : "text-red-600"}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${hasEntries ? "text-amber-900" : "text-red-900"}`}>
              {hasEntries
                ? `Eksponeringsregister påkrevd – ${existingEntryCount} registrering${existingEntryCount !== 1 ? "er" : ""} funnet`
                : "Eksponeringsregister er påkrevd for dette stoffet"}
            </p>
            <p className={`text-sm mt-1 ${hasEntries ? "text-amber-800" : "text-red-800"}`}>
              Dette kjemikaliet er klassifisert som:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {classifications.map((c) => (
                <Badge
                  key={c.code}
                  className="bg-red-100 text-red-800 border-red-300 font-mono text-xs"
                >
                  {c.code}
                </Badge>
              ))}
            </div>
            <p className={`text-xs mt-2 ${hasEntries ? "text-amber-700" : "text-red-700"}`}>
              Alle ansatte som er, har vært eller kan bli eksponert for dette stoffet skal registreres
              i eksponeringsregisteret jf.{" "}
              <a
                href="https://www.arbeidstilsynet.no/hms/roller-i-hms-arbeidet/arbeidsgiver/register-over-eksponerte-arbeidstakere/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Arbeidstilsynets krav
              </a>
              . Registeret skal oppbevares i minst 40–60 år.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/dashboard/exposure-register/new?chemicalId=${chemicalId}`}>
              <Button
                size="sm"
                className={hasEntries ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Registrer eksponering
              </Button>
            </Link>
            {hasEntries && (
              <Link href={`/dashboard/exposure-register?chemical=${chemicalId}`}>
                <Button size="sm" variant="outline" className="w-full border-amber-400 text-amber-800 hover:bg-amber-100">
                  Se registreringer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Kompakt badge for bruk i lister
 */
export function ExposureRegisterBadge({
  hazardStatements,
  isCMR,
}: {
  hazardStatements: string | null | undefined;
  isCMR: boolean;
}) {
  const classifications = detectCmrClassifications(hazardStatements, isCMR);
  if (classifications.length === 0) return null;

  return (
    <Badge className="bg-red-100 text-red-800 border-red-300 text-xs gap-1">
      <AlertTriangle className="h-3 w-3" />
      Eks.reg.
    </Badge>
  );
}
