"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ElectricalWorkType } from "@/features/sja/lib/sja-fse";
import { createSjaTemplate } from "@/server/actions/sja.actions";

interface TemplateHazard {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
}

interface SjaTemplateDraft {
  description: string;
  workLocation: string;
  electricalWorkType: ElectricalWorkType;
  workMethod: string;
  requiredEquipment: string;
  requiredPpe: string;
  personnelRequirements: string;
  safetyConditions: string;
  requiresSecondPerson: boolean;
  requiredCourseKeys: string[];
  hazards: TemplateHazard[];
}

interface SjaSaveAsTemplateButtonProps {
  tenantId: string;
  suggestedName: string;
  templateDraft: SjaTemplateDraft;
  disabled?: boolean;
}

export function SjaSaveAsTemplateButton({
  tenantId,
  suggestedName,
  templateDraft,
  disabled = false,
}: SjaSaveAsTemplateButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(suggestedName);
    }
  }

  async function handleSave() {
    const validHazards = templateDraft.hazards.filter(
      (hazard) =>
        hazard.activity.trim() &&
        hazard.hazard.trim() &&
        hazard.measures.trim(),
    );
    if (name.trim().length < 3 || validHazards.length === 0) {
      toast({
        title: "Malen kan ikke lagres",
        description:
          "Gi malen et navn og fyll ut minst én fare med aktivitet, fare og tiltak.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const result = await createSjaTemplate({
      tenantId,
      name: name.trim(),
      description: templateDraft.description,
      workLocation: templateDraft.workLocation,
      electricalWorkType: templateDraft.electricalWorkType,
      workMethod: templateDraft.workMethod,
      requiredEquipment: templateDraft.requiredEquipment,
      requiredPpe: templateDraft.requiredPpe,
      personnelRequirements: templateDraft.personnelRequirements,
      safetyConditions: templateDraft.safetyConditions,
      requiresSecondPerson: templateDraft.requiresSecondPerson,
      requiredCourseKeys: templateDraft.requiredCourseKeys,
      hazards: validHazards,
    });
    setIsSaving(false);

    if (!result.success) {
      toast({
        title: "Kunne ikke lagre malen",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setOpen(false);
    toast({
      title: "SJA-mal lagret",
      description: "Malen er nå tilgjengelig for hele organisasjonen.",
    });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full bg-transparent"
          disabled={disabled}
        >
          <BookTemplate className="mr-2 h-4 w-4" />
          Lagre som mal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lagre SJA som organisasjonsmal</DialogTitle>
          <DialogDescription>
            Arbeidsforutsetninger, farer og tiltak lagres. Dato, deltakere, vær,
            prosjekt og godkjenning må vurderes på nytt hver gang malen brukes,
            jf. internkontrollforskriften § 5 nr. 3 og 6.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sja-template-name">Navn på mal *</Label>
          <Input
            id="sja-template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Eksempel: Servicearbeid i tavlerom"
            maxLength={120}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lagre mal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
