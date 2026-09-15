import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchMocCreateOptions } from "@/server/queries/moc.queries";
import { MocForm } from "@/features/moc/components/moc-form";

export default async function NewMocPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }
  if (!auth.permissions.canCreateMoc) {
    redirect("/dashboard/moc");
  }

  const options = await fetchMocCreateOptions();
  if (!options?.moduleEnabled) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Foreslå endring</h1>
        <p className="text-muted-foreground">
          Endringen skal vurderes og godkjennes før iverksetting, med unntak av utilsiktede endringer.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Endringsforespørsel</CardTitle>
        </CardHeader>
        <CardContent>
          <MocForm projects={options.projects} />
        </CardContent>
      </Card>
    </div>
  );
}
