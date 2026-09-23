import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { getCurrentUser } from "@/lib/server-action";
import { EquipmentApprovalList } from "@/features/equipment-approval/components/equipment-approval-list";
import {
  getEquipmentApprovalContext,
  listEquipmentApprovals,
} from "@/server/queries/equipment-approval.queries";

export default async function EquipmentApprovalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const access = await getEquipmentApprovalContext();
  if (!access) redirect("/dashboard");

  const items = await listEquipmentApprovals();
  if (!items) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Wrench className="h-7 w-7 text-slate-700" />
          Utstyr med godkjenning
        </h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Register over arbeidsutstyr som har godkjenning eller sakkyndig kontroll. Gyldig periode,
          leverandør, attest og kobling til rutiner, risiko og avvik. FuA § 12-5, § 12-8, § 13-1 og § 13-4.
        </p>
      </div>
      <EquipmentApprovalList items={items} canEdit={access.canEdit} />
    </div>
  );
}
