import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AuditForm } from "@/features/audits/components/audit-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const audit = await prisma.audit.findUnique({
    where: { id, tenantId },
  });

  if (!audit) {
    return <div>Revisjon ikke funnet</div>;
  }

  // Hent alle brukere for tenant (for revisorer)
  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/audits/${audit.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til revisjon
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Rediger revisjon</h1>
        <p className="text-muted-foreground">{audit.title}</p>
      </div>

      <AuditForm tenantId={tenantId} users={tenantUsers} audit={audit} mode="edit" />
    </div>
  );
}

