import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Unlock, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getGroupContentById } from "@/server/actions/corporate-group-content.actions";
import { listGroupTenants } from "@/server/actions/corporate-group.actions";
import { ContentActions } from "./content-actions";

const contentTypeLabels: Record<string, string> = {
  ROUTINE: "Rutine",
  DOCUMENT: "Dokument",
  RISK_ASSESSMENT: "Risikovurdering",
  INSPECTION_TEMPLATE: "Inspeksjonsmal",
  SJA_TEMPLATE: "SJA-mal",
  TRAINING_COURSE: "Opplæringskurs",
  CHEMICAL: "Kjemikalie",
  HANDBOOK_SECTION: "HMS-håndbok",
};

export default async function CorporateGroupContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let content;
  try {
    content = await getGroupContentById(id);
  } catch {
    notFound();
  }

  const tenants = await listGroupTenants();
  const availableTenants = tenants.map((t) => ({
    id: t.tenant.id,
    name: t.tenant.name,
    city: t.tenant.city,
  }));

  const statusColors: Record<string, string> = {
    PUBLISHED: "bg-green-50 text-green-700",
    ARCHIVED: "bg-amber-50 text-amber-700",
    DRAFT: "bg-gray-100 text-gray-600",
  };

  const statusLabels: Record<string, string> = {
    PUBLISHED: "Publisert",
    ARCHIVED: "Arkivert",
    DRAFT: "Utkast",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/konsern/innhold">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">
              {contentTypeLabels[content.contentType] ?? content.contentType}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">v{content.version}</span>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              {content.distributionMode === "LOCKED" ? (
                <><Lock className="h-3.5 w-3.5" /> Låst</>
              ) : (
                <><Unlock className="h-3.5 w-3.5" /> Tilpassbar</>
              )}
            </div>
            <span className="text-gray-300">·</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[content.status] ?? statusColors.DRAFT}`}>
              {statusLabels[content.status] ?? content.status}
            </span>
          </div>
        </div>
        <Link href={`/konsern/innhold/${id}/rediger`}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Rediger
          </Button>
        </Link>
      </div>

      {content.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beskrivelse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.description}</p>
          </CardContent>
        </Card>
      )}

      {content.legalReference && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lovhjemmel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{content.legalReference}</p>
          </CardContent>
        </Card>
      )}

      {content.content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Innhold</CardTitle>
          </CardHeader>
          <CardContent>
            {typeof content.content === "object" && (content.content as Record<string, unknown>).html ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: (content.content as Record<string, unknown>).html as string }}
              />
            ) : (
              <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(content.content, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      <ContentActions
        contentId={content.id}
        status={content.status}
        distributions={content.distributions.map((d) => ({
          id: d.id,
          tenantId: d.tenantId,
          status: d.status,
          locallyModified: d.locallyModified,
          tenant: {
            id: d.tenant.id,
            name: d.tenant.name,
            city: d.tenant.city,
          },
        }))}
        availableTenants={availableTenants}
      />
    </div>
  );
}
