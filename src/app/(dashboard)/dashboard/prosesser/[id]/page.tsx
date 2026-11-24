import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getPermissions } from "@/lib/permissions";
import { QMS_MODULE_LINKS, QMS_PROCESS_KIND_LABELS, QMS_PROCESS_STATUS_LABELS, type QmsProcessKindValue, type QmsProcessStatusValue } from "@/lib/qms-processes";
import { DeleteProcessButton } from "@/features/qms-processes/components/process-actions";
import { getQmsProcess } from "@/server/queries/qms-process.queries";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

function moduleLabel(href: string | null): string | null {
  if (!href) return null;
  return QMS_MODULE_LINKS.find((link) => link.href === href)?.label ?? href;
}

export default async function ProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) redirect("/login");
  const { id } = await params;
  const process = await getQmsProcess(id);
  if (!process) notFound();
  const canEdit = getPermissions(session.user.role, session.user.extraRoles).canCreateDocuments;
  const module = moduleLabel(process.moduleHref);

  const fields = [
    ["Formål", process.purpose],
    ["Innganger", process.inputs],
    ["Forventede resultater", process.outputs],
    ["Kriterier og oppfølging", process.criteria],
    ["Ressurser", process.resources],
    ["Risiko og muligheter", process.risksAndOpportunities],
    ["Begrunnelse for utenfor omfang", process.scopeReason],
    ["Vurdering", process.evaluationNote],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/prosesser" className="hover:underline">Prosesser</Link>
          </p>
          <h1 className="text-3xl font-bold">{process.name}</h1>
          <p className="text-muted-foreground">
            {QMS_PROCESS_KIND_LABELS[process.kind as QmsProcessKindValue]}
            {" · "}
            {QMS_PROCESS_STATUS_LABELS[process.status as QmsProcessStatusValue]}
            {" · "}
            Eier: {process.owner?.name ?? "ikke satt"}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/prosesser/${process.id}/rediger`}>Rediger</Link>
            </Button>
            <DeleteProcessButton id={process.id} />
          </div>
        ) : null}
      </div>

      <dl className="space-y-4">
        {fields.map(([label, value]) => (
          value ? (
            <div key={label}>
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="whitespace-pre-wrap text-sm text-muted-foreground">{value}</dd>
            </div>
          ) : null
        ))}
      </dl>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Steg</h2>
        {process.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen steg er registrert.</p>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {process.steps.map((step) => (
              <li key={step.id}>
                <span className="font-medium">{step.title}</span>
                {step.description ? <p className="text-muted-foreground">{step.description}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Samspill og oppfølging</h2>
        <p>
          Leverer til: {process.outgoing.length === 0 ? "–" : process.outgoing.map((link) => link.toProcess.name).join(", ")}
        </p>
        <p>Rutine: {process.routine ? process.routine.title : "–"}</p>
        <p>
          Modul: {module && process.moduleHref ? (
            <Link href={process.moduleHref} className="hover:underline">{module}</Link>
          ) : "–"}
        </p>
        <p>Sist vurdert: {formatDate(process.lastEvaluatedAt)}</p>
        <p>Neste vurdering: {formatDate(process.nextReviewAt)}</p>
      </section>
    </div>
  );
}
