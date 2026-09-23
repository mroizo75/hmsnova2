"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createPersonnelDocumentFromTemplate } from "@/server/actions/personnel.actions";
import type { HrPersonnelTemplate } from "@/server/queries/personnel.queries";

interface PersonnelFromTemplateFormProps {
  userId: string;
  templates: HrPersonnelTemplate[];
  onCreated?: () => void;
}

export function PersonnelFromTemplateForm({
  userId,
  templates,
  onCreated,
}: PersonnelFromTemplateFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");

  if (templates.length === 0) return null;

  function handleCreate() {
    if (!templateId) return;

    startTransition(async () => {
      const result = await createPersonnelDocumentFromTemplate({ userId, templateId });
      if (!result.success) {
        toast({ title: result.error, variant: "destructive" });
        return;
      }
      toast({ title: `«${result.data.title}» er lagt i personalmappen` });
      onCreated?.();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <div className="space-y-2">
        <Label htmlFor="hr-template">Opprett fra HR-mal</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger id="hr-template">
            <SelectValue placeholder="Velg mal" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Arbeidsavtale og attest hører hjemme her (AML § 14-5/14-6 og § 15-15), ikke i Dokumenter.
        </p>
      </div>
      <Button type="button" onClick={handleCreate} disabled={isPending || !templateId}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Opprett i mappen
      </Button>
    </div>
  );
}
