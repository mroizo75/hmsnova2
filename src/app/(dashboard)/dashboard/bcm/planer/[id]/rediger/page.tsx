import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentEditForm } from "@/features/documents/components/document-edit-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { bcmPlanHref, isBcmTemplateCategory } from "@/lib/bcm-audit";

export default async function BcmPlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const document = await prisma.document.findFirst({
    where: {
      id,
      tenantId: userTenant.tenantId,
    },
    include: {
      template: { select: { category: true } },
    },
  });

  if (!document) {
    redirect("/dashboard/bcm");
  }

  if (!isBcmTemplateCategory(document.template?.category)) {
    redirect(`/dashboard/documents/${id}/edit`);
  }

  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId: userTenant.tenantId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      user: { name: "asc" },
    },
  });

  const templates = await prisma.documentTemplate.findMany({
    where: {
      OR: [{ isGlobal: true }, { tenantId: userTenant.tenantId }],
    },
    orderBy: [
      { isGlobal: "desc" },
      { name: "asc" },
    ],
  });

  const ownerOptions = tenantUsers
    .map((member) => ({
      id: member.user?.id ?? "",
      name: member.user?.name ?? member.user?.email ?? "Ukjent",
      email: member.user?.email ?? "",
      role: member.role,
    }))
    .filter((member) => member.id);

  const templateOptions = templates.map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    defaultReviewIntervalMonths: template.defaultReviewIntervalMonths,
    isGlobal: template.isGlobal,
    pdcaGuidance: template.pdcaGuidance as Record<string, string> | null,
  }));

  const { template: _bcmTemplate, ...documentRecord } = document;
  const detailHref = bcmPlanHref(document.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={detailHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til plan
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Rediger beredskapsplan</h1>
        <p className="text-muted-foreground">
          Oppdater metadata og tilgangskontroll for &quot;{document.title}&quot;
        </p>
      </div>

      <DocumentEditForm
        document={documentRecord}
        owners={ownerOptions}
        templates={templateOptions}
        returnTo={detailHref}
      />
    </div>
  );
}
