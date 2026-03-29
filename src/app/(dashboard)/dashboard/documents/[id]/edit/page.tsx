import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentEditForm } from "@/features/documents/components/document-edit-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
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
  });

  if (!document) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dokument ikke funnet</h1>
        <p className="text-muted-foreground">
          Dette dokumentet finnes ikke eller du har ikke tilgang til det.
        </p>
        <Button asChild>
          <Link href="/dashboard/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til dokumenter
          </Link>
        </Button>
      </div>
    );
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
    .filter((user) => user.id);

  const templateOptions = templates.map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    defaultReviewIntervalMonths: template.defaultReviewIntervalMonths,
    isGlobal: template.isGlobal,
    pdcaGuidance: template.pdcaGuidance as Record<string, string> | null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til dokumenter
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Rediger dokument</h1>
        <p className="text-muted-foreground">
          Oppdater metadata og tilgangskontroll for "{document.title}"
        </p>
      </div>

      <DocumentEditForm
        document={document}
        owners={ownerOptions}
        templates={templateOptions}
      />
    </div>
  );
}

