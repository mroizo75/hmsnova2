import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewVersionForm } from "@/features/documents/components/new-version-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants[0];
  if (!userTenant) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!document) {
    return <div>Dokument ikke funnet</div>;
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
        <h1 className="text-3xl font-bold">Last opp ny versjon</h1>
        <p className="text-muted-foreground">
          {document.title} - Gjeldende versjon: {document.version}
        </p>
      </div>

      <NewVersionForm document={document} />
    </div>
  );
}

