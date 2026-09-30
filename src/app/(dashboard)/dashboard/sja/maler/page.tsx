import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookTemplate, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SjaTemplateManageActions } from "@/components/sja/sja-template-manage-actions";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export default async function SjaTemplatesPage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canApproveSja) redirect("/dashboard/sja");

  const templates = await prisma.sjaTemplate.findMany({
    where: { tenantId: auth.tenantId, isActive: true },
    include: { hazards: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isLockedByGroup: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/sja"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BookTemplate className="h-7 w-7 text-amber-600" />
              SJA-maler
            </h1>
            <p className="text-muted-foreground">
              Sett opp arbeidet én gang, så får ansatte en ferdig start hver gang.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/sja/maler/ny">
            <Plus className="mr-2 h-4 w-4" /> Ny mal
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <BookTemplate className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
            <h2 className="font-semibold">Ingen aktive maler</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Opprett en mal med arbeidsmetode, farer og tiltak.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                    )}
                  </div>
                  <SjaTemplateManageActions
                    templateId={template.id}
                    templateName={template.name}
                    isLockedByGroup={template.isLockedByGroup}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{template.hazards.length} farer</Badge>
                    {template.electricalWorkType !== "NOT_APPLICABLE" && (
                      <Badge variant="outline">FSE-kontroll</Badge>
                    )}
                    {template.requiresSecondPerson && (
                      <Badge variant="outline">Person nummer to</Badge>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {template.hazards.map((hazard) => (
                      <div key={hazard.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{hazard.activity}</p>
                        <p className="text-muted-foreground">{hazard.hazard}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/sja/new?mal=${template.id}`}>Forhåndsvis i SJA</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
