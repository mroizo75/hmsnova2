import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { DocumentForm } from "@/features/documents/components/document-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewDocumentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants[0];
  if (!userTenant) {
    return <div>Ingen tilgang til tenant</div>;
  }

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

      <DocumentForm tenantId={userTenant.tenantId} />
    </div>
  );
}

