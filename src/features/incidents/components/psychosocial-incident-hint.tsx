import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

/** AML kap. 2 A: personalsaker og kritikkverdige forhold mot leder hører i varsling, ikke avvik. */
export function PsychosocialIncidentHint({ href = "/ansatt/varsling" }: { href?: string }) {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
      <ShieldAlert className="h-4 w-4 text-amber-700" />
      <AlertDescription className="text-amber-950 dark:text-amber-100">
        Gjelder saken personkonflikt, trakassering eller kritikkverdige forhold mot leder? Bruk{" "}
        <Link href={href} className="font-medium underline underline-offset-2">
          varslingskanalen
        </Link>{" "}
        (AML kap. 2 A). Avvik er for hendelser og avvik fra rutiner.
      </AlertDescription>
    </Alert>
  );
}
