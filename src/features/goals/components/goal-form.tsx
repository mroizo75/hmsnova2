"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createGoal, updateGoal } from "@/server/actions/goal.actions";
import { useToast } from "@/hooks/use-toast";
import type { Goal } from "@prisma/client";

interface GoalFormProps {
  tenantId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  goal?: Goal;
  mode?: "create" | "edit";
}

export function GoalForm({ tenantId, users, goal, mode = "create" }: GoalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tenantId,
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as string,
      targetValue: parseFloat(formData.get("targetValue") as string) || undefined,
      currentValue: parseFloat(formData.get("currentValue") as string) || 0,
      unit: formData.get("unit") as string || undefined,
      baseline: parseFloat(formData.get("baseline") as string) || undefined,
      year: parseInt(formData.get("year") as string),
      quarter: formData.get("quarter") ? parseInt(formData.get("quarter") as string) : undefined,
      startDate: formData.get("startDate") as string || undefined,
      deadline: formData.get("deadline") as string || undefined,
      ownerId: formData.get("ownerId") as string,
      status: formData.get("status") as string,
    };

    try {
      const result =
        mode === "edit" && goal
          ? await updateGoal({ id: goal.id, ...data })
          : await createGoal(data);

      if (result.success) {
        toast({
          title: mode === "edit" ? "✅ Mål oppdatert" : "✅ Mål opprettet",
          description: mode === "edit" ? "Endringene er lagret" : "Målet er opprettet",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/goals");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre mål",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Måltittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Reduser arbeidsskader med 50%"
              required
              disabled={loading}
              defaultValue={goal?.title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Beskriv målet i detalj..."
              disabled={loading}
              defaultValue={goal?.description || ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select name="category" required disabled={loading} defaultValue={goal?.category || "QUALITY"}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUALITY">Kvalitet</SelectItem>
                  <SelectItem value="HMS">HMS</SelectItem>
                  <SelectItem value="ENVIRONMENT">Miljø</SelectItem>
                  <SelectItem value="CUSTOMER">Kunde</SelectItem>
                  <SelectItem value="EFFICIENCY">Effektivitet</SelectItem>
                  <SelectItem value="FINANCE">Økonomi</SelectItem>
                  <SelectItem value="COMPETENCE">Kompetanse</SelectItem>
                  <SelectItem value="OTHER">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select name="status" required disabled={loading} defaultValue={goal?.status || "ACTIVE"}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktivt</SelectItem>
                  <SelectItem value="ACHIEVED">Oppnådd</SelectItem>
                  <SelectItem value="AT_RISK">I risiko</SelectItem>
                  <SelectItem value="FAILED">Ikke oppnådd</SelectItem>
                  <SelectItem value="ARCHIVED">Arkivert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline</Label>
              <Input
                id="baseline"
                name="baseline"
                type="number"
                step="0.01"
                placeholder="Utgangspunkt"
                disabled={loading}
                defaultValue={goal?.baseline || ""}
              />
              <p className="text-sm text-muted-foreground">
                Nåværende verdi før forbedring
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetValue">Målverdi</Label>
              <Input
                id="targetValue"
                name="targetValue"
                type="number"
                step="0.01"
                placeholder="Ønsket verdi"
                disabled={loading}
                defaultValue={goal?.targetValue || ""}
              />
              <p className="text-sm text-muted-foreground">
                Verdi vi skal oppnå
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Enhet</Label>
              <Input
                id="unit"
                name="unit"
                placeholder="%, antall, NOK, etc"
                disabled={loading}
                defaultValue={goal?.unit || ""}
              />
            </div>
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="currentValue">Nåværende verdi</Label>
              <Input
                id="currentValue"
                name="currentValue"
                type="number"
                step="0.01"
                placeholder="Oppdateres ved målinger"
                disabled={loading}
                defaultValue={goal?.currentValue || ""}
              />
              <p className="text-sm text-muted-foreground">
                Oppdateres automatisk ved målinger
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year">År *</Label>
              <Input
                id="year"
                name="year"
                type="number"
                min="2020"
                max="2100"
                required
                disabled={loading}
                defaultValue={goal?.year || currentYear}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">Kvartal (valgfritt)</Label>
              <Select name="quarter" disabled={loading} defaultValue={goal?.quarter?.toString() || "NONE"}>
                <SelectTrigger>
                  <SelectValue placeholder="Helt år" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Helt år</SelectItem>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerId">Ansvarlig *</Label>
              <Select name="ownerId" required disabled={loading} defaultValue={goal?.ownerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansvarlig" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Startdato</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                disabled={loading}
                defaultValue={
                  goal?.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Frist</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                disabled={loading}
                defaultValue={
                  goal?.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : ""
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-blue-900 mb-2">
            📋 ISO 9001 - 6.2 Kvalitetsmål
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Mål skal være målbare</li>
            <li>Mål skal være relevante for organisasjonen</li>
            <li>Mål skal overvåkes og måles regelmessig</li>
            <li>Mål skal kommuniseres til relevant personell</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : mode === "edit" ? "Lagre endringer" : "Opprett mål"}
        </Button>
      </div>
    </form>
  );
}

