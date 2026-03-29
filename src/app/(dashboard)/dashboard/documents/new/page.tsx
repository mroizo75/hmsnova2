import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { DocumentForm } from "@/features/documents/components/document-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function NewDocumentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId: userTenant.tenantId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  const templates = await prisma.documentTemplate.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { tenantId: userTenant.tenantId },
      ],
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
        <h1 className="text-3xl font-bold">Nytt dokument</h1>
        <p className="text-muted-foreground">
          Last opp et nytt dokument til systemet
        </p>
      </div>

      <DocumentForm
        tenantId={userTenant.tenantId}
        owners={ownerOptions}
        templates={templateOptions}
      />
    </div>
  );
}

