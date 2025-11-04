import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MobileFindingForm } from "@/features/inspections/components/mobile-finding-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

async function getInspection(id: string, tenantId: string) {
  return await db.inspection.findFirst({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export default async function InspectionMobilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    return notFound();
  }

  const inspection = await getInspection(id, session.user.tenantId);

  if (!inspection) {
    return notFound();
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      PLANNED: { label: "Planlagt", variant: "secondary" },
      IN_PROGRESS: { label: "Pågår", variant: "default" },
      COMPLETED: { label: "Fullført", variant: "outline" },
      CANCELLED: { label: "Kansellert", variant: "outline" },
    };
    return variants[status] || variants.PLANNED;
  };

  const statusInfo = getStatusBadge(inspection.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/dashboard/inspections/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold line-clamp-1">{inspection.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            {inspection.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{inspection.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {inspection.findings.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Registrerte funn</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {inspection.findings.filter((f) => f.status === "OPEN").length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Åpne funn</div>
          </div>
        </div>

        {/* Add Finding Form */}
        <MobileFindingForm inspectionId={id} />
      </div>
    </div>
  );
}

