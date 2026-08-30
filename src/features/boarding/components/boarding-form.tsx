"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CreateBoardingSchema,
  type CreateBoardingInput,
} from "@/features/boarding/schemas/boarding.schema";
import { createBoarding } from "@/server/actions/boarding.actions";

interface Employee {
  userId: string;
  user: { id: string; name: string | null; email: string };
}

interface TemplateTask {
  title: string;
  daysOffset?: number;
  legalRef?: string | null;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  tasks: TemplateTask[];
}

interface BoardingFormProps {
  employees: Employee[];
  templates: Template[];
}

export function BoardingForm({ employees, templates }: BoardingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateBoardingInput>({
    resolver: zodResolver(CreateBoardingSchema),
    defaultValues: {
      type: "ONBOARDING",
      startDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const selectedType = form.watch("type");
  const selectedTemplateId = form.watch("templateId");
  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.type === selectedType),
    [templates, selectedType],
  );
  const selectedTemplate = filteredTemplates.find((t) => t.id === selectedTemplateId);

  async function onSubmit(data: CreateBoardingInput) {
    setLoading(true);
    setError(null);
    const result = await createBoarding(data);
    setLoading(false);
    if (result.success) {
      router.push("/dashboard/onboarding");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Type prosess</FormLabel>
              <div className="grid gap-3 md:grid-cols-2">
                <TypeOption
                  selected={field.value === "ONBOARDING"}
                  title="Onboarding"
                  description="Nyansatt. Arbeidsavtale innen 7 dager (AML § 14-5)."
                  onClick={() => {
                    field.onChange("ONBOARDING");
                    form.setValue("templateId", undefined);
                  }}
                />
                <TypeOption
                  selected={field.value === "OFFBOARDING"}
                  title="Offboarding"
                  description="Slutt. Sluttattest og sletting av tilganger (AML § 15-15)."
                  onClick={() => {
                    field.onChange("OFFBOARDING");
                    form.setValue("templateId", undefined);
                  }}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansatt</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Velg ansatt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.userId} value={e.userId}>
                          {e.user.name ?? e.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Personen prosessen gjelder.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === "ONBOARDING" ? "Tiltredelsesdato" : "Siste arbeidsdag"}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="w-full" {...field} />
                  </FormControl>
                  <FormDescription>
                    {selectedType === "ONBOARDING"
                      ? "Oppgaver beregnes fra denne datoen."
                      : "Oppgaver beregnes mot siste arbeidsdag."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem className="md:col-span-2 xl:col-span-1">
                  <FormLabel>Sjekkliste-mal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Velg mal (valgfritt)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredTemplates.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Ingen maler for denne typen
                        </SelectItem>
                      ) : (
                        filteredTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} · {t.tasks.length} oppgaver
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Malen kopieres til prosessen. Kan hoppes over.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium">Oppgaver i malen</p>
              {selectedTemplate ? (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description ?? selectedTemplate.name}
                  </p>
                  <ol className="mt-4 divide-y rounded-md border">
                    {selectedTemplate.tasks.map((task, i) => (
                      <li
                        key={`${task.title}-${i}`}
                        className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
                      >
                        <span>{task.title}</span>
                        {task.legalRef && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {task.legalRef}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Velg en mal for å se hvilke oppgaver som opprettes.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notater</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={8}
                        className="min-h-[180px] resize-y"
                        placeholder="Intern merknad til leder eller HR"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Oppretter..." : "Opprett prosess"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => router.push("/dashboard/onboarding")}
          >
            Avbryt
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TypeOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-5 py-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-transparent hover:bg-muted/50",
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </button>
  );
}
