"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks } from "lucide-react";
import { publishRegulatoryRoutines } from "@/server/actions/regulatory.actions";
import type { RegulatoryRoutineSuggestion } from "@/server/actions/regulatory.actions";
import { getRoutineCategoryLabel } from "@/lib/routine-categories";
import { useToast } from "@/hooks/use-toast";

type Props = {
  suggestions: RegulatoryRoutineSuggestion[];
};

export function RegulatoryRoutinePicker({ suggestions }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const selectionSeed = suggestions
    .map((s) => `${s.templateId}:${s.publishedRoutineId ?? ""}:${s.recommended ? "1" : "0"}`)
    .join("|");

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    suggestions
      .filter((s) => s.publishedRoutineId || s.recommended)
      .map((s) => s.templateId),
  );

  useEffect(() => {
    setSelectedIds(
      suggestions
        .filter((s) => s.publishedRoutineId || s.recommended)
        .map((s) => s.templateId),
    );
  }, [selectionSeed, suggestions]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = suggestions.map((s) => s.templateId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));

  function selectAll() {
    setSelectedIds(allIds);
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishRegulatoryRoutines(selectedIds);
      if (!result.success) {
        toast({ variant: "destructive", title: "Kunne ikke publisere rutiner" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["juridisk-register"] });
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      router.refresh();
      toast({
        title: "Rutiner oppdatert",
        description: `${result.published} publisert, ${result.archived} tatt vekk.`,
      });
    });
  }

  if (suggestions.length === 0) {
    return null;
  }

  const publishedCount = suggestions.filter((s) => s.publishedRoutineId).length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              Rutiner fra regelverket
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Velg hvilke rutiner som skal publiseres for virksomheten. Du kan huke av flere, velge alle, eller ta vekk rutiner som ikke skal gjelde. Hjemmel: IK-HMS § 5.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={isPending || allSelected}>
              Velg alle
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={isPending || selectedIds.length === 0}>
              Fjern alle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {suggestions.map((item) => {
            const checked = selectedSet.has(item.templateId);
            return (
              <div
                key={item.templateId}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <Checkbox
                  id={`reg-routine-${item.templateId}`}
                  checked={checked}
                  onCheckedChange={(value) => {
                    const next = value === true;
                    setSelectedIds((prev) => {
                      if (next) {
                        return prev.includes(item.templateId) ? prev : [...prev, item.templateId];
                      }
                      return prev.filter((id) => id !== item.templateId);
                    });
                  }}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <label htmlFor={`reg-routine-${item.templateId}`} className="min-w-0 flex-1 cursor-pointer">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.publishedRoutineId && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Publisert</Badge>
                    )}
                    {item.recommended && !item.publishedRoutineId && (
                      <Badge variant="secondary">Anbefalt</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getRoutineCategoryLabel(item.category)}
                    {item.legalReference ? ` · ${item.legalReference}` : ""}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} valgt · {publishedCount} allerede publisert
          </p>
          <Button onClick={handlePublish} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publiser valgte rutiner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
