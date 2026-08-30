import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchFollowUpById } from "@/server/queries/absence.queries";
import { FollowUpPlanForm } from "@/features/absence/components/follow-up-plan-form";
import { DialogMeetingForm } from "@/features/absence/components/dialog-meeting-form";
import { FollowUpDetail } from "@/features/absence/components/follow-up-detail";

interface Props {
  params: Promise<{ id: string; milestoneId: string }>;
}

export default async function MilestonePage({ params }: Props) {
  const { id, milestoneId } = await params;
  const auth = await getAuthContext();

  if (!auth.permissions.canReadOwnAbsence && !auth.permissions.canReadAllAbsence) {
    redirect("/dashboard");
  }

  const followUp = await fetchFollowUpById(milestoneId);
  if (!followUp) notFound();

  const canEdit = auth.permissions.canApproveAbsence;
  const isDone = followUp.status === "COMPLETED" || followUp.status === "SKIPPED";

  const isDialogMeeting = [
    "DIALOG_MEETING_1",
    "DIALOG_MEETING_2",
    "DIALOG_MEETING_3",
  ].includes(followUp.milestone);

  const isPlan = followUp.milestone === "FOLLOW_UP_PLAN";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/fravaer/${id}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake til fravær
          </Link>
        </Button>
      </div>

      {/* Rediger-skjema for plan/møte, eller detalj-visning */}
      {canEdit && !isDone && isPlan && (
        <FollowUpPlanForm
          followUpId={milestoneId}
          absenceId={id}
          initialData={followUp}
        />
      )}

      {canEdit && !isDone && isDialogMeeting && (
        <DialogMeetingForm
          followUpId={milestoneId}
          absenceId={id}
          milestone={followUp.milestone}
          initialData={followUp}
        />
      )}

      {/* For allerede fullførte eller generelle milepæler */}
      {(isDone || (!isPlan && !isDialogMeeting)) && (
        <FollowUpDetail followUp={followUp} canEdit={canEdit} />
      )}
    </div>
  );
}
