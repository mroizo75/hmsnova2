import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { Activity } from "lucide-react";
import { fetchAuditLogs } from "@/server/queries/audit-log.queries";
import { AuditLogContent } from "@/features/audit-log/components/audit-log-content";

export const metadata = { title: "Aktivitetslogg" };

export default async function AktivitetsloggPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const isAdmin =
    auth.role === "ADMIN" || auth.role === "HMS" || auth.role === "LEDER";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const initialData = await fetchAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-7 w-7 text-primary" />
          Aktivitetslogg
        </h1>
        <p className="text-muted-foreground mt-1">
          Oversikt over alle handlinger utført i systemet. Brukes til
          sporbarhet og internkontroll (IK-HMS § 5, ISO 9001 kap. 10.2).
        </p>
      </div>

      <AuditLogContent initialData={initialData} />
    </div>
  );
}
