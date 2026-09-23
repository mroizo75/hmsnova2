import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server-action";
import { EquipmentApprovalDetail } from "@/features/equipment-approval/components/equipment-approval-detail";
import {
  getEquipmentApproval,
  getEquipmentApprovalContext,
} from "@/server/queries/equipment-approval.queries";

export default async function EquipmentApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await getEquipmentApprovalContext();
  if (!access) redirect("/dashboard");

  const { id } = await params;
  const equipment = await getEquipmentApproval(id);
  if (!equipment) {
    return <div className="p-6">Fant ikke utstyret.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/dashboard/utstyr">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til utstyr
        </Link>
      </Button>
      <EquipmentApprovalDetail equipment={equipment} canEdit={access.canEdit} />
    </div>
  );
}
