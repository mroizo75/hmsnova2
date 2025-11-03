import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChemicalForm } from "@/features/chemicals/components/chemical-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditChemicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const chemical = await prisma.chemical.findUnique({
    where: { id, tenantId },
  });

  if (!chemical) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/chemicals/${chemical.id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til kjemikalie
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Rediger kjemikalie</h1>
        <p className="text-muted-foreground">{chemical.productName}</p>
      </div>

      <ChemicalForm chemical={chemical} mode="edit" />
    </div>
  );
}

