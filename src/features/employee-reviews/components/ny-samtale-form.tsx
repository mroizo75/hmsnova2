"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateEmployeeReviewSchema,
  type CreateEmployeeReviewInput,
} from "@/features/employee-reviews/schemas/employee-review.schema";
import { createEmployeeReview } from "@/server/actions/employee-review.actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Employee = {
  id: string;
  name: string | null;
  email: string;
};

interface NySamtaleFormProps {
  employees: Employee[];
}

export function NySamtaleForm({ employees }: NySamtaleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateEmployeeReviewInput>({
    resolver: zodResolver(CreateEmployeeReviewSchema) as Resolver<CreateEmployeeReviewInput>,
    defaultValues: {
      employeeId: "",
      scheduledDate: undefined,
      nextReviewDate: null,
      konfidensielt: true,
    },
  });

  function onSubmit(data: CreateEmployeeReviewInput) {
    startTransition(async () => {
      const result = await createEmployeeReview(data);
      if (result.success) {
        toast({ title: "Medarbeidersamtale opprettet" });
        router.push(`/dashboard/medarbeidersamtale/${result.data.id}`);
      } else {
        toast({
          title: "Feil",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Planlegg medarbeidersamtale</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Velg ansatt */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansatt *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg ansatt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name ?? emp.email}
                          {emp.name && (
                            <span className="text-muted-foreground ml-1">
                              ({emp.email})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Planlagt dato */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planlagt dato *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Neste samtale */}
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neste samtale (valgfritt)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Planlegg neste samtale allerede nå (f.eks. om 6 eller 12 mnd)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Konfidensialitet */}
            <FormField
              control={form.control}
              name="konfidensielt"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Konfidensiell samtale</FormLabel>
                    <FormDescription>
                      Innholdet er kun synlig for leder og ansatt (GDPR art. 5)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opprett samtale
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Avbryt
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
