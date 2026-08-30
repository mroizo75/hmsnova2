import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbsenceForm } from "@/features/absence/components/absence-form";

export default async function NyFravaerPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canCreateAbsence) redirect("/dashboard/fravaer");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/fravaer">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold">Registrer fravær</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Registrer fravær, sykefravær eller ferie for en ansatt.
        </p>
      </div>

      <AbsenceForm />
    </div>
  );
}
