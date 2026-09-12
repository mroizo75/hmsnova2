"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateEmployeeHrProfile } from "@/server/actions/hr-profile.actions";
import type { HrProfileRow } from "@/server/queries/personnel.queries";

interface HrProfileFormProps {
  userId: string;
  profile: HrProfileRow;
  canEditHrFields: boolean;
  canEditNotes: boolean;
  canEditKin: boolean;
  canEditBirthDate: boolean;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function HrProfileForm({
  userId,
  profile,
  canEditHrFields,
  canEditNotes,
  canEditKin,
  canEditBirthDate,
}: HrProfileFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nationality, setNationality] = useState(profile.nationality ?? "");
  const [languages, setLanguages] = useState(profile.languages.join(", "));
  const [hrNotes, setHrNotes] = useState(profile.hrNotes ?? "");
  const [startedAt, setStartedAt] = useState(toDateInput(profile.startedAt));
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(profile.dateOfBirth));
  const [kin, setKin] = useState([
    profile.nextOfKin[0] ?? { name: "", relation: "", phone: "" },
    profile.nextOfKin[1] ?? { name: "", relation: "", phone: "" },
  ]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateEmployeeHrProfile({
        userId,
        nationality: canEditHrFields ? nationality : undefined,
        languages: canEditHrFields
          ? languages.split(",").map((item) => item.trim()).filter(Boolean)
          : undefined,
        hrNotes: canEditNotes ? hrNotes : undefined,
        startedAt: canEditHrFields ? startedAt || null : undefined,
        dateOfBirth: canEditBirthDate ? dateOfBirth || null : undefined,
        nextOfKin: canEditKin
          ? kin.map((item) => ({
              name: item.name,
              relation: item.relation,
              phone: item.phone,
            }))
          : undefined,
      });
      if (result.success === false) {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Lagret", description: "Personalopplysningene er oppdatert" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {profile.employeeNumber && (
        <p className="text-sm text-muted-foreground">Lønnsnummer: {profile.employeeNumber}</p>
      )}
      {(canEditHrFields || canEditNotes) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nationality">Nasjonalitet</Label>
            <Input
              id="nationality"
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              disabled={!canEditNotes}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="languages">Arbeidsspråk</Label>
            <Input
              id="languages"
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              disabled={!canEditHrFields}
              placeholder="Norsk, engelsk"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startedAt">Ansatt fra</Label>
            <Input
              id="startedAt"
              type="date"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
              disabled={!canEditHrFields}
            />
          </div>
          {(canEditBirthDate || profile.dateOfBirth) && (
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Fødselsdato</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                disabled={!canEditBirthDate}
              />
            </div>
          )}
        </div>
      )}

      {canEditKin && (
        <div className="grid gap-4 sm:grid-cols-2">
          {kin.map((item, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Pårørende {index + 1}</p>
              <Input
                value={item.name}
                onChange={(event) =>
                  setKin((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                  )
                }
                placeholder="Navn"
              />
              <Input
                value={item.relation ?? ""}
                onChange={(event) =>
                  setKin((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, relation: event.target.value } : row)),
                  )
                }
                placeholder="Relasjon"
              />
              <Input
                value={item.phone ?? ""}
                onChange={(event) =>
                  setKin((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, phone: event.target.value } : row)),
                  )
                }
                placeholder="Telefon"
              />
            </div>
          ))}
        </div>
      )}

      {canEditNotes && (
        <div className="space-y-2">
          <Label htmlFor="hrNotes">HR-notat</Label>
          <Textarea
            id="hrNotes"
            value={hrNotes}
            onChange={(event) => setHrNotes(event.target.value)}
            rows={4}
            placeholder="Kun intern personaloppfølging. Ingen helse eller diagnose."
          />
        </div>
      )}

      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Lagrer..." : "Lagre personalopplysninger"}
      </Button>
    </div>
  );
}
