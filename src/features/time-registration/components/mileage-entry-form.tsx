"use client";

import { useState } from "react";
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
import { createMileageEntry } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface MileageEntryFormProps {
  tenantId: string;
  projects: Project[];
  initialProjectId?: string;
  defaultKmRate: number;
  defaultDate?: Date;
  /** Når false: skjuler Kr/km (admin har satt sats), for ansatt */
  rateEditable?: boolean;
  /** Vis forklaring om at km godtgjørelse er tillegg som må være avtalt */
  showDisclaimer?: boolean;
}

export function MileageEntryForm({
  tenantId,
  projects,
  initialProjectId,
  defaultKmRate,
  defaultDate = new Date(),
  rateEditable = true,
  showDisclaimer = false,
}: MileageEntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [kilometers, setKilometers] = useState("");
  const [ratePerKm, setRatePerKm] = useState(String(defaultKmRate));
  const [comment, setComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(kilometers.replace(",", "."));
    if (!projectId || isNaN(km) || km <= 0) {
      toast({ variant: "destructive", title: "Fyll ut prosjekt og km" });
      return;
    }
    setLoading(true);
    try {
      const res = await createMileageEntry({
        tenantId,
        projectId,
        date: new Date(date),
        kilometers: km,
        ratePerKm: rateEditable
          ? parseFloat(ratePerKm.replace(",", ".")) || undefined
          : defaultKmRate,
        comment: comment.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: "Km godtgjørelse registrert" });
      router.refresh();
      setDate(format(new Date(), "yyyy-MM-dd"));
      setProjectId(initialProjectId ?? "");
      setKilometers("");
      setComment("");
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (projects.length === 0) return null;

  return (
    <div className="space-y-3">
      {showDisclaimer && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
          Km godtgjørelse er et tillegg som må være avtalt med arbeidsgiver. Legg kun inn kjøring hvis dere har avtalt dette.
        </p>
      )}
      {!rateEditable && (
        <p className="text-xs text-muted-foreground">
          Sats: {defaultKmRate} kr/km (satt av leder)
        </p>
      )}
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Dato</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Prosjekt</Label>
        <Select value={projectId} onValueChange={setProjectId} required>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Velg prosjekt" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code ? `${p.code} – ` : ""}{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Km</Label>
        <Input
          type="text"
          value={kilometers}
          onChange={(e) => setKilometers(e.target.value)}
          placeholder="120"
          className="w-24"
        />
      </div>
      {rateEditable && (
        <div className="space-y-1">
          <Label className="text-xs">Kr/km</Label>
          <Input
            type="text"
            value={ratePerKm}
            onChange={(e) => setRatePerKm(e.target.value)}
            placeholder={String(defaultKmRate)}
            className="w-20"
          />
        </div>
      )}
      <div className="space-y-1 flex-1 min-w-[120px]">
        <Label className="text-xs">Kommentar</Label>
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Valgfritt"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={loading}>
        {loading ? "..." : "Registrer km"}
      </Button>
    </form>
    </div>
  );
}
