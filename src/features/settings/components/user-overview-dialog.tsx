"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { fetchUserOverview } from "@/server/queries/users.queries";
import { updateEmployeeHrProfile } from "@/server/actions/hr-profile.actions";
import { useToast } from "@/hooks/use-toast";
import { getRoleDisplayName } from "@/lib/permissions";
import {
  getTrainingStatusColor,
  getTrainingStatusLabel,
} from "@/features/training/schemas/training.schema";
import type { Role } from "@prisma/client";
import { formatLastSeen } from "@/lib/last-seen";

type Overview = NonNullable<Awaited<ReturnType<typeof fetchUserOverview>>>;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

const NONE = "__none__";

interface UserOverviewDialogProps {
  userId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function UserOverviewDialog({ userId, onClose, onSaved }: UserOverviewDialogProps) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [position, setPosition] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [managerId, setManagerId] = useState(NONE);
  const [nationality, setNationality] = useState("");
  const [languages, setLanguages] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [kin, setKin] = useState([
    { name: "", relation: "", phone: "" },
    { name: "", relation: "", phone: "" },
  ]);

  useEffect(() => {
    if (!userId) {
      setOverview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchUserOverview(userId)
      .then((data) => {
        if (cancelled || !data) {
          if (!cancelled) setOverview(data);
          return;
        }
        setOverview(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setPostalCode(data.postalCode ?? "");
        setCity(data.city ?? "");
        setPosition(data.position ?? "");
        setEmployeeNumber(data.employeeNumber ?? "");
        setDepartmentId(data.departmentId ?? NONE);
        setManagerId(data.managerId ?? NONE);
        setNationality(data.nationality ?? "");
        setLanguages(data.languages.join(", "));
        setStartedAt(data.startedAt?.slice(0, 10) ?? "");
        setDateOfBirth(data.dateOfBirth?.slice(0, 10) ?? "");
        setHrNotes(data.hrNotes ?? "");
        setKin([
          {
            name: data.nextOfKin[0]?.name ?? "",
            relation: data.nextOfKin[0]?.relation ?? "",
            phone: data.nextOfKin[0]?.phone ?? "",
          },
          {
            name: data.nextOfKin[1]?.name ?? "",
            relation: data.nextOfKin[1]?.relation ?? "",
            phone: data.nextOfKin[1]?.phone ?? "",
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save() {
    if (!userId || !overview?.canEditContact) return;
    setSaving(true);
    try {
      const result = await updateEmployeeHrProfile({
        userId,
        name,
        phone,
        address,
        postalCode,
        city,
        position,
        employeeNumber,
        nationality,
        languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
        startedAt: startedAt || null,
        dateOfBirth: dateOfBirth || null,
        hrNotes: overview.canEditNotes ? hrNotes : undefined,
        departmentId: overview.canEditOrg ? (departmentId === NONE ? null : departmentId) : undefined,
        managerId: overview.canEditOrg ? (managerId === NONE ? null : managerId) : undefined,
        nextOfKin: kin,
      });
      if (result.success === false) {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Lagret", description: "Opplysningene om den ansatte er oppdatert" });
      onSaved?.();
      const fresh = await fetchUserOverview(userId);
      setOverview(fresh);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={userId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{overview?.name || "Bruker"}</DialogTitle>
          <DialogDescription>
            Kontakt, pårørende og registrert kompetanse.
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Henter opplysninger...</p>}

        {!loading && !overview && (
          <p className="text-sm text-muted-foreground">Kunne ikke hente brukeren.</p>
        )}

        {overview && (
          <div className="space-y-5">
            {overview.canEditContact ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="overview-name">Navn</Label>
                  <Input id="overview-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <Field label="E-post" value={overview.email} />
                <div className="space-y-1">
                  <Label htmlFor="overview-phone">Telefon</Label>
                  <Input id="overview-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="overview-address">Adresse</Label>
                  <Input id="overview-address" value={address} onChange={(event) => setAddress(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-postal">Postnummer</Label>
                  <Input id="overview-postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-city">Poststed</Label>
                  <Input id="overview-city" value={city} onChange={(event) => setCity(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-position">Stilling</Label>
                  <Input id="overview-position" value={position} onChange={(event) => setPosition(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-employee-number">Ansattnummer</Label>
                  <Input
                    id="overview-employee-number"
                    value={employeeNumber}
                    onChange={(event) => setEmployeeNumber(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-started">Ansatt fra</Label>
                  <Input id="overview-started" type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-birth">Fødselsdato</Label>
                  <Input id="overview-birth" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-nationality">Nasjonalitet</Label>
                  <Input id="overview-nationality" value={nationality} onChange={(event) => setNationality(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overview-languages">Arbeidsspråk</Label>
                  <Input id="overview-languages" value={languages} onChange={(event) => setLanguages(event.target.value)} />
                </div>
                {overview.canEditOrg ? (
                  <>
                    <div className="space-y-1">
                      <Label>Avdeling</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Ingen avdeling</SelectItem>
                          {overview.departments.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Nærmeste leder</Label>
                      <Select value={managerId} onValueChange={setManagerId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Ingen leder</SelectItem>
                          {overview.managers
                            .filter((item) => item.id !== userId)
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Avdeling" value={overview.department} />
                    <Field label="Nærmeste leder" value={overview.managerName} />
                  </>
                )}
                <Field label="Rolle" value={getRoleDisplayName(overview.role as Role)} />
                <Field label="Sist inne" value={formatLastSeen(overview.lastSeenAt).label} />
              </div>
            ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-post" value={overview.email} />
              <Field label="Sist inne" value={formatLastSeen(overview.lastSeenAt).label} />
              <Field label="Telefon" value={overview.phone} />
              <Field label="Adresse" value={overview.address} />
              <Field label="Postnummer" value={overview.postalCode} />
              <Field label="Poststed" value={overview.city} />
              <Field label="Rolle" value={getRoleDisplayName(overview.role as Role)} />
              <Field label="Ansattnr." value={overview.employeeNumber} />
              <Field label="Stilling" value={overview.position} />
              <Field label="Avdeling" value={overview.department} />
              <Field label="Nærmeste leder" value={overview.managerName} />
              <Field label="Ansatt fra" value={formatDate(overview.startedAt)} />
              <Field label="Fødselsdato" value={formatDate(overview.dateOfBirth)} />
              <Field label="Nasjonalitet" value={overview.nationality} />
              <Field label="Arbeidsspråk" value={overview.languages.join(", ")} />
            </div>
            )}

            {overview.canEditContact && (
              <div className="grid gap-3 sm:grid-cols-2">
                {kin.map((item, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Pårørende {index + 1}</p>
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setKin((prev) => prev.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                      }
                      placeholder="Navn"
                    />
                    <Input
                      value={item.relation}
                      onChange={(event) =>
                        setKin((prev) => prev.map((row, i) => (i === index ? { ...row, relation: event.target.value } : row)))
                      }
                      placeholder="Relasjon"
                    />
                    <Input
                      value={item.phone}
                      onChange={(event) =>
                        setKin((prev) => prev.map((row, i) => (i === index ? { ...row, phone: event.target.value } : row)))
                      }
                      placeholder="Telefon"
                    />
                  </div>
                ))}
              </div>
            )}

            {overview.canEditNotes && (
              <div className="space-y-1">
                <Label htmlFor="overview-notes">HR-notat</Label>
                <Textarea
                  id="overview-notes"
                  value={hrNotes}
                  onChange={(event) => setHrNotes(event.target.value)}
                  rows={4}
                  placeholder="Kun intern personaloppfølging. Ingen helse eller diagnose."
                />
              </div>
            )}

            {overview.canEditContact && (
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Lagrer..." : "Lagre opplysninger"}
              </Button>
            )}

            {!overview.canEditContact && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pårørende</p>
              {overview.nextOfKin.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen pårørende er registrert.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {overview.nextOfKin.map((kin, index) => (
                    <div key={`${kin.name}-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{kin.name}</p>
                      <p className="text-muted-foreground">{kin.relation || "Relasjon ikke oppgitt"}</p>
                      <p>{kin.phone || "Ingen telefon"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Kompetanse</p>
              {overview.trainings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen kompetanse er registrert.</p>
              ) : (
                <div className="space-y-2">
                  {overview.trainings.map((training) => (
                    <Link
                      key={training.id}
                      href={`/dashboard/training/${training.id}`}
                      className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{training.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {training.completedAt
                            ? `Gjennomført ${formatDate(training.completedAt)}`
                            : "Ikke dokumentert gjennomført"}
                          {training.validUntil
                            ? ` · Gyldig til ${formatDate(training.validUntil)}`
                            : " · Utløper ikke"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${getTrainingStatusColor(training.status)}`}
                      >
                        {getTrainingStatusLabel(training.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {overview.showHrNotes && !overview.canEditNotes && (
              <div>
                <p className="text-sm font-medium">HR-notat</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {overview.hrNotes?.trim() || "Ingen notat."}
                </p>
              </div>
            )}

            {overview.canOpenPersonnelFolder && (
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href={`/dashboard/personalarkiv/${userId}`}>Åpne personalmappe</Link>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
