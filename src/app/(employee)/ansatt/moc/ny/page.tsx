import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMocCreateOptions } from "@/server/queries/moc.queries";
import { MocForm } from "@/features/moc/components/moc-form";

export default async function AnsattNyMocPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const options = await fetchMocCreateOptions();
  if (!options?.moduleEnabled) {
    redirect("/ansatt");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Foreslå endring</h1>
        <p className="text-muted-foreground">
          HMS og leder vurderer saken. Du får beskjed når status endres.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Endringsforespørsel</CardTitle>
        </CardHeader>
        <CardContent>
          <MocForm projects={options.projects} successPath="/ansatt/moc" />
        </CardContent>
      </Card>
    </div>
  );
}
