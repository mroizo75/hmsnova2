import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getPermissions } from "@/lib/permissions";
import {
  QMS_KIND_ORDER,
  QMS_PROCESS_KIND_LABELS,
  QMS_PROCESS_STATUS_LABELS,
  type QmsProcessKindValue,
  type QmsProcessStatusValue,
} from "@/lib/qms-processes";
import { SeedProcessesButton } from "@/features/qms-processes/components/process-actions";
import { listQmsProcesses } from "@/server/queries/qms-process.queries";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export default async function ProcessesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) redirect("/login");
  const canEdit = getPermissions(session.user.role, session.user.extraRoles).canCreateDocuments;
  const processes = await listQmsProcesses();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Prosesser</h1>
            <p className="text-muted-foreground">
              Prosessene i styringssystemet, rekkefølgen og samspillet mellom dem (ISO 9001:2015 pkt. 4.4).
            </p>
          </div>
          <PageHelpDialog content={helpContent.processes} />
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href="/dashboard/prosesser/ny">Ny prosess</Link>
          </Button>
        ) : null}
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        Forslagene dekker salg, utforming, innkjøp, levering, installasjon og oppstart, HMS og ledelse.
        De er utkast til bedriften tilpasser. En prosess som ikke gjelder, merkes utenfor omfang med begrunnelse.
        Sett den aktiv først når eier, inn og ut, kriterier og steg er på plass.
      </p>

      {processes.length === 0 ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm">Ingen prosesser er registrert ennå.</p>
          {canEdit ? <SeedProcessesButton /> : null}
        </div>
      ) : (
        <div className="space-y-8">
          {canEdit ? <SeedProcessesButton /> : null}
          {QMS_KIND_ORDER.map((kind) => {
            const group = processes.filter((process) => process.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} className="space-y-3">
                <h2 className="text-lg font-semibold">{QMS_PROCESS_KIND_LABELS[kind as QmsProcessKindValue]}</h2>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Prosess</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Eier</th>
                        <th className="px-4 py-3 font-medium">Leverer til</th>
                        <th className="px-4 py-3 font-medium">Neste vurdering</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((process) => (
                        <tr key={process.id} className="border-t">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/prosesser/${process.id}`} className="font-medium hover:underline">
                              {process.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{process.steps.length} steg</p>
                          </td>
                          <td className="px-4 py-3">
                            {QMS_PROCESS_STATUS_LABELS[process.status as QmsProcessStatusValue]}
                          </td>
                          <td className="px-4 py-3">{process.owner?.name ?? "–"}</td>
                          <td className="px-4 py-3">
                            {process.outgoing.length === 0
                              ? "–"
                              : process.outgoing.map((link) => link.toProcess.name).join(", ")}
                          </td>
                          <td className="px-4 py-3">{formatDate(process.nextReviewAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
