import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { ProcessForm } from "@/features/qms-processes/components/process-form";
import { listQmsProcessOptions } from "@/server/queries/qms-process.queries";

export const dynamic = "force-dynamic";

export default async function NewProcessPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) redirect("/login");
  if (!getPermissions(session.user.role, session.user.extraRoles).canCreateDocuments) redirect("/dashboard/prosesser");
  const options = await listQmsProcessOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ny prosess</h1>
        <p className="text-muted-foreground">Beskriv prosessen slik den faktisk utføres i bedriften.</p>
      </div>
      <ProcessForm users={options.users} routines={options.routines} processes={options.processes} />
    </div>
  );
}
