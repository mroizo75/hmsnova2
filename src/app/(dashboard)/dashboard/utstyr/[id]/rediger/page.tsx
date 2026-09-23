import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server-action";
import { EquipmentApprovalForm } from "@/features/equipment-approval/components/equipment-approval-form";
import {
  getEquipmentApproval,
  getEquipmentApprovalContext,
} from "@/server/queries/equipment-approval.queries";
import { toDateInputValue } from "@/lib/equipment-approval";

export default async function EditEquipmentApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await getEquipmentApprovalContext();
  if (!access?.canEdit) redirect("/dashboard/utstyr");

  const { id } = await params;
  const equipment = await getEquipmentApproval(id);
  if (!equipment) {
    return <div className="p-6">Fant ikke utstyret.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/utstyr/${equipment.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rediger {equipment.name}</h1>
      </div>
      <EquipmentApprovalForm
        mode="edit"
        equipmentId={equipment.id}
        initial={{
          name: equipment.name,
          category: equipment.category,
          supplierName: equipment.supplierName,
          approvalBody: equipment.approvalBody,
          certificateNumber: equipment.certificateNumber ?? "",
          serialNumber: equipment.serialNumber ?? "",
          location: equipment.location ?? "",
          validFrom: toDateInputValue(equipment.validFrom),
          validTo: toDateInputValue(equipment.validTo),
          operationalStatus: equipment.operationalStatus,
          notes: equipment.notes ?? "",
        }}
      />
    </div>
  );
}
