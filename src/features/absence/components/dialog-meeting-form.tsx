"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateDialogMeetingSchema, type UpdateDialogMeetingInput } from "@/features/absence/schemas/follow-up.schema";
import { updateDialogMeeting } from "@/server/actions/absence.actions";
import type { FollowUpMilestone } from "@prisma/client";

const milestoneLabels: Partial<Record<FollowUpMilestone, string>> = {
  DIALOG_MEETING_1: "Dialogmøte 1 (AML § 4-6 (4))",
  DIALOG_MEETING_2: "Dialogmøte 2 (Ftrl. § 8-7a)",
  DIALOG_MEETING_3: "Dialogmøte 3 (Ftrl. § 8-7a)",
};

interface DialogMeetingFormProps {
  followUpId: string;
  absenceId: string;
  milestone: FollowUpMilestone;
  initialData?: {
    meetingDate?: string | null;
    meetingNotes?: string | null;
    attendees?: string | null;
    doctorAttended?: boolean;
    navAttended?: boolean;
    notes?: string | null;
  };
}

export function DialogMeetingForm({ followUpId, absenceId, milestone, initialData }: DialogMeetingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let parsedAttendees: string[] = [];
  if (initialData?.attendees) {
    try {
      parsedAttendees = JSON.parse(initialData.attendees);
    } catch {
      parsedAttendees = [];
    }
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateDialogMeetingInput>({
    resolver: zodResolver(UpdateDialogMeetingSchema),
    defaultValues: {
      id: followUpId,
      meetingDate: initialData?.meetingDate?.slice(0, 10) ?? "",
      meetingNotes: initialData?.meetingNotes ?? "",
      attendees: parsedAttendees,
      doctorAttended: initialData?.doctorAttended ?? false,
      navAttended: initialData?.navAttended ?? false,
      notes: initialData?.notes ?? "",
    },
  });

  const doctorAttended = watch("doctorAttended");
  const navAttended = watch("navAttended");

  async function onSubmit(data: UpdateDialogMeetingInput) {
    setLoading(true);
    setError(null);
    const result = await updateDialogMeeting(data);
    setLoading(false);
    if (result.success) {
      router.push(`/dashboard/fravaer/${absenceId}`);
    } else {
      setError(result.error);
    }
  }

  const title = milestoneLabels[milestone] ?? "Dialogmøte";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("id")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {milestone === "DIALOG_MEETING_1"
              ? "Arbeidsgiver innkaller til dialogmøte innen 7 uker."
              : "NAV innkaller til dialogmøte. Arbeidsgiver plikter å delta."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="meetingDate">Møtedato *</Label>
            <Input
              id="meetingDate"
              type="date"
              {...register("meetingDate")}
            />
            {errors.meetingDate && (
              <p className="text-sm text-destructive mt-1">{errors.meetingDate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="meetingNotes">Møtereferat</Label>
            <Textarea
              id="meetingNotes"
              {...register("meetingNotes")}
              placeholder="Oppsummering av hva som ble drøftet og avtalt..."
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="doctorAttended"
                checked={doctorAttended}
                onCheckedChange={(checked) => setValue("doctorAttended", checked === true)}
              />
              <Label htmlFor="doctorAttended" className="text-sm font-normal">
                Sykmelder/lege deltok
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="navAttended"
                checked={navAttended}
                onCheckedChange={(checked) => setValue("navAttended", checked === true)}
              />
              <Label htmlFor="navAttended" className="text-sm font-normal">
                NAV deltok
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notater</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Eventulle notater..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : "Fullfør dialogmøte"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/fravaer/${absenceId}`)}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
