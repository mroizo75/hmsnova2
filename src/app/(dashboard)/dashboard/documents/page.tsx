import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/features/documents/components/document-list";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export default async function DocumentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Hent første tenant (senere: la bruker velge)
  const userTenant = user.tenants[0];
  if (!userTenant) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const documents = await prisma.document.findMany({
    where: { tenantId: userTenant.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: documents.length,
    draft: documents.filter(d => d.status === "DRAFT").length,
    approved: documents.filter(d => d.status === "APPROVED").length,
    archived: documents.filter(d => d.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dokumenter</h1>
          <p className="text-muted-foreground">
            Administrer lover, prosedyrer, sjekklister og mer
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            Nytt dokument
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utkast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Godkjent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arkivert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      <DocumentList documents={documents} tenantId={userTenant.tenantId} currentUserId={user.id} />
    </div>
  );
}
