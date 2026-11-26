"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  createPersonnelDocumentFromTemplate,
  getHrDocumentMergeFields,
} from "@/server/actions/personnel.actions";
import type { HrPersonnelTemplate } from "@/server/queries/personnel.queries";
import { validateHrMergeValues, type HrMergeField } from "@/lib/hr-document-merge";

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
  const [fields, setFields] = useState<HrMergeField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    setIsLoadingFields(true);
    void getHrDocumentMergeFields({ userId, templateId }).then((result) => {
      if (cancelled) return;
      setIsLoadingFields(false);
      if (result.success === false) {
        setFields([]);
        setValues({});
        toast({ title: result.error, variant: "destructive" });
        return;
      }
      setFields(result.data.fields);
      setValues(Object.fromEntries(result.data.fields.map((field) => [field.key, field.value])));
    });
    return () => {
      cancelled = true;
    };
  }, [templateId, userId, toast]);

  if (templates.length === 0) return null;

  const mergeError = validateHrMergeValues(
    fields.map((field) => field.key),
    values,
  );

  function handleCreate() {
    if (!templateId || mergeError) return;

    startTransition(async () => {
      const result = await createPersonnelDocumentFromTemplate({ userId, templateId, values });
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
    <div className="space-y-4">
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
          Malen i biblioteket endres ikke. Opplysningene under gjelder bare dokumentet som lagres i denne personalmappen.
        </p>
      </div>

      {isLoadingFields ? (
        <p className="text-sm text-muted-foreground">Henter opplysninger fra ansatt og bedrift…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`hr-merge-${field.key}`}>{field.label}</Label>
              <Input
                id={`hr-merge-${field.key}`}
                type={field.input}
                min={field.input === "number" ? 1 : undefined}
                max={field.key === "antallVirkedager" ? 12 : undefined}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      <Button type="button" onClick={handleCreate} disabled={isPending || isLoadingFields || !!mergeError}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Opprett i mappen
      </Button>
    </div>
  );
}
