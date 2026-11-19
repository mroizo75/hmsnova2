"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPLIER_QUESTION_TYPES,
  SUPPLIER_QUESTION_TYPE_LABELS,
  type SupplierQuestionDraft,
  type SupplierQuestionTypeValue,
} from "@/lib/supplier-management";
import { saveSupplierForm } from "@/server/actions/supplier-form.actions";

export function SupplierFormEditor({
  title,
  questions,
}: {
  title: string;
  questions: SupplierQuestionDraft[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(title);
  const [items, setItems] = useState<SupplierQuestionDraft[]>(questions);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, patch: Partial<SupplierQuestionDraft>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("title", name);
    formData.set("questions", JSON.stringify(items));
    setError(null);
    startTransition(async () => {
      const result = await saveSupplierForm(formData);
      if (!result.success) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
        return;
      }
      toast({ title: "Skjemaet er lagret" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="form-title">Navn på skjemaet</Label>
        <Input id="form-title" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
      </div>
      <div className="space-y-4">
        {items.map((question, index) => (
          <div key={index} className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Spørsmål {index + 1}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => move(index, -1)} disabled={index === 0}>
                  Opp
                </Button>
                <Button type="button" variant="outline" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                  Ned
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Fjern
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`label-${index}`}>Spørsmål</Label>
              <Input
                id={`label-${index}`}
                value={question.label}
                onChange={(event) => update(index, { label: event.target.value })}
                required
                minLength={2}
                maxLength={300}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`type-${index}`}>Svartype</Label>
                <select
                  id={`type-${index}`}
                  value={question.fieldType}
                  onChange={(event) => update(index, { fieldType: event.target.value as SupplierQuestionTypeValue })}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {SUPPLIER_QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SUPPLIER_QUESTION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-8 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(event) => update(index, { required: event.target.checked })}
                />
                Må besvares
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`help-${index}`}>Hjelpetekst</Label>
              <Textarea
                id={`help-${index}`}
                value={question.helpText}
                onChange={(event) => update(index, { helpText: event.target.value })}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setItems((current) => [...current, { label: "", helpText: "", fieldType: "TEXTAREA", required: true }])}
      >
        Legg til spørsmål
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" disabled={pending || items.length === 0}>
          {pending ? "Lagrer…" : "Lagre skjema"}
        </Button>
      </div>
    </form>
  );
}
