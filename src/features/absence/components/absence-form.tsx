"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AbsenceType } from "@prisma/client";
import { createAbsence, updateAbsence } from "@/server/actions/absence.actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  SELF_CERTIFIED: "Egenmelding",
  SICK_LEAVE: "Sykemelding",
  PARENTAL_LEAVE: "Foreldrepermisjon",
  VACATION: "Ferie",
  LEAVE_OF_ABSENCE: "Permisjon",
  COMPENSATORY: "Avspasering",
  CARE_DAYS: "Omsorgsdager",
  MILITARY: "Militærtjeneste",
  BEREAVEMENT: "Velferdspermisjon",
  OTHER: "Annet",
};

const AbsenceFormSchema = z.object({
  type: z.enum([
    "SELF_CERTIFIED",
    "SICK_LEAVE",
    "PARENTAL_LEAVE",
    "VACATION",
    "LEAVE_OF_ABSENCE",
    "COMPENSATORY",
    "CARE_DAYS",
    "MILITARY",
    "BEREAVEMENT",
    "OTHER",
  ]),
  startDate: z.date({ error: "Startdato er påkrevd" }),
  endDate: z.date({ error: "Sluttdato er påkrevd" }),
  percentage: z.number().min(1).max(100).default(100),
  reason: z.string().optional(),
  doctorName: z.string().optional(),
  selfCertifiedDays: z.number().min(1).max(16).optional(),
});

type AbsenceFormValues = z.infer<typeof AbsenceFormSchema>;

type InitialData = {
  id: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  percentage: number;
  reason: string | null;
  doctorName: string | null;
  selfCertifiedDays: number | null;
};

interface AbsenceFormProps {
  initialData?: InitialData;
  forEmployee?: boolean;
}

export function AbsenceForm({ initialData, forEmployee }: AbsenceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initialData;

  const form = useForm<AbsenceFormValues>({
    resolver: zodResolver(AbsenceFormSchema) as Resolver<AbsenceFormValues>,
    defaultValues: initialData
      ? {
          type: initialData.type,
          startDate: new Date(initialData.startDate),
          endDate: new Date(initialData.endDate),
          percentage: initialData.percentage,
          reason: initialData.reason ?? "",
          doctorName: initialData.doctorName ?? "",
          selfCertifiedDays: initialData.selfCertifiedDays ?? undefined,
        }
      : {
          type: undefined,
          startDate: undefined,
          endDate: undefined,
          percentage: 100,
          reason: "",
          doctorName: "",
          selfCertifiedDays: undefined,
        },
  });

  const selectedType = form.watch("type");
  const redirectPath = forEmployee ? "/ansatt/fravaer" : "/dashboard/fravaer";

  function onSubmit(data: AbsenceFormValues) {
    startTransition(async () => {
      const payload = {
        type: data.type,
        startDate: data.startDate.toISOString().split("T")[0],
        endDate: data.endDate.toISOString().split("T")[0],
        percentage: data.percentage,
        reason: data.reason,
        doctorName: data.doctorName,
        selfCertifiedDays: data.selfCertifiedDays,
      };
      const result = isEditing
        ? await updateAbsence({ id: initialData!.id, ...payload })
        : await createAbsence(payload);

      if (result.success) {
        toast({
          title: isEditing ? "Fravær oppdatert" : "Fravær registrert",
        });
        router.push(redirectPath);
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
        <CardTitle>
          {isEditing ? "Rediger fravær" : "Registrer fravær"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type fravær *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.entries(ABSENCE_TYPE_LABELS) as [
                          AbsenceType,
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fra dato *</FormLabel>
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
                            e.target.value ? new Date(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Til dato *</FormLabel>
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
                            e.target.value ? new Date(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fraværsprosent</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    100% = fullt fravær, 50% = halv dag / gradert sykemelding
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === "SICK_LEAVE" && (
              <FormField
                control={form.control}
                name="doctorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legens navn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Navn på behandlende lege"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Påkrevd ved sykemelding fra lege (AML § 5-1)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === "SELF_CERTIFIED" && (
              <FormField
                control={form.control}
                name="selfCertifiedDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antall egenmeldingsdager</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={16}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Maks 3 sammenhengende dager, 4 perioder per 12 mnd
                      (Folketrygdloven § 8-27)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kommentar (valgfritt)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Eventuell tilleggsinformasjon..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Lagre endringer" : "Registrer fravær"}
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
