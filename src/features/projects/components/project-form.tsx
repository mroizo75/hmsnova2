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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ProjectFormProps {
  users: Array<{ id: string; name: string | null; email: string }>;
  defaultValues?: {
    id?: string;
    name?: string;
    code?: string;
    orderNumber?: string;
    clientName?: string;
    location?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    projectManagerId?: string;
  };
  mode: "create" | "edit";
}

const statusOptions = [
  { value: "PLANNING", label: "Planlegging" },
  { value: "ACTIVE", label: "Aktiv" },
  { value: "ON_HOLD", label: "På vent" },
  { value: "COMPLETED", label: "Fullført" },
  { value: "ARCHIVED", label: "Arkivert" },
];

const NO_MANAGER = "__none__";

export function ProjectForm({ users, defaultValues, mode }: ProjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projectManagerId, setProjectManagerId] = useState(
    defaultValues?.projectManagerId ?? NO_MANAGER
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      code: (form.get("code") as string) || undefined,
      orderNumber: (form.get("orderNumber") as string) || undefined,
      clientName: (form.get("clientName") as string) || undefined,
      location: (form.get("location") as string) || undefined,
      description: (form.get("description") as string) || undefined,
      status: (form.get("status") as string) || "PLANNING",
      startDate: (form.get("startDate") as string) || undefined,
      endDate: (form.get("endDate") as string) || undefined,
      projectManagerId:
        projectManagerId !== NO_MANAGER ? projectManagerId : undefined,
    };

    try {
      const url =
        mode === "edit" && defaultValues?.id
          ? `/api/projects/${defaultValues.id}`
          : "/api/projects";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Feil ved lagring");
      }

      const data = await res.json();
      toast({
        title: mode === "create" ? "Prosjekt opprettet" : "Prosjekt oppdatert",
        className: "bg-green-50 border-green-200",
      });
      router.push(`/dashboard/projects/${data.project.id}`);
      router.refresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Feil", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prosjektinformasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Prosjektnavn *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="F.eks. Mongstad Vedlikehold 2026"
                defaultValue={defaultValues?.name}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Prosjektkode</Label>
              <Input
                id="code"
                name="code"
                placeholder="F.eks. PRJ-001"
                defaultValue={defaultValues?.code}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Ordrenr / oppdragsnr</Label>
              <Input
                id="orderNumber"
                name="orderNumber"
                placeholder="F.eks. 2025-0142"
                defaultValue={defaultValues?.orderNumber}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Kunde / oppdragsgiver</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="F.eks. Equinor ASA"
                defaultValue={defaultValues?.clientName}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Arbeidssted / lokasjon</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Mongstad Raffineri"
                defaultValue={defaultValues?.location}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={defaultValues?.status ?? "PLANNING"} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Startdato</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={defaultValues?.startDate}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Sluttdato</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={defaultValues?.endDate}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Prosjektleder</Label>
              <Select
                value={projectManagerId}
                onValueChange={setProjectManagerId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg prosjektleder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MANAGER}>— Ingen —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Kort beskrivelse av prosjektet, omfang og mål"
              rows={3}
              defaultValue={defaultValues?.description ?? ""}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Lagrer..."
            : mode === "create"
            ? "Opprett prosjekt"
            : "Lagre endringer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
