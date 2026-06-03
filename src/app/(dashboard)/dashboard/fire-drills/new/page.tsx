"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Flame, Save } from "lucide-react";
import Link from "next/link";
import { FIRE_DRILL_TYPE_LABELS } from "@/features/fire-drills/schemas/fire-drill.schema";
import type { FireDrillType } from "@/features/fire-drills/schemas/fire-drill.schema";

interface TenantUser {
  user: { id: string; name: string | null; email: string };
}

export default function NewFireDrillPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [form, setForm] = useState({
    title: "",
    drillType: "EVACUATION" as FireDrillType,
    isAnnounced: true,
    plannedDate: "",
    location: "",
    responsibleId: "",
    objectives: "",
    scenario: "",
    riskAssessment: "",
    sharedPremises: false,
    buildingOwnerCoordinated: false,
    buildingOwnerName: "",
    otherTenantsInformed: false,
    fullBuildingEvacuation: false,
    totalBuildingOccupants: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.tenantId) return;
      try {
        const res = await fetch(`/api/tenants/${session.user.tenantId}/users`);
        const data = await res.json();
        if (res.ok && data.users) {
          setUsers(data.users);
          if (session.user.id) {
            setForm((prev) => ({ ...prev, responsibleId: session.user.id ?? "" }));
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [session?.user?.tenantId, session?.user?.id]);

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.plannedDate || !form.location || !form.responsibleId || !form.objectives) {
      toast({ title: "Fyll ut alle påkrevde felt", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fire-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plannedDate: new Date(form.plannedDate).toISOString(),
          scenario: form.scenario || undefined,
          riskAssessment: form.riskAssessment || undefined,
          buildingOwnerName: form.buildingOwnerName || undefined,
          totalBuildingOccupants: form.totalBuildingOccupants
            ? parseInt(form.totalBuildingOccupants, 10)
            : undefined,
          // Fjern samordningsfelt hvis ikke delt bygg
          buildingOwnerCoordinated: form.sharedPremises ? form.buildingOwnerCoordinated : undefined,
          otherTenantsInformed: form.sharedPremises ? form.otherTenantsInformed : undefined,
          fullBuildingEvacuation: form.sharedPremises ? form.fullBuildingEvacuation : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Ukjent feil");
      }

      const drill = await res.json();
      toast({ title: "Brannøvelse planlagt", description: form.title });
      router.push(`/dashboard/fire-drills/${drill.id}`);
    } catch (error) {
      toast({
        title: "Kunne ikke opprette øvelse",
        description: error instanceof Error ? error.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/fire-drills">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Tilbake
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Flame className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Planlegg brannøvelse</h1>
          <p className="text-sm text-muted-foreground">
            Forskrift om brannforebygging § 12 — systematisk sikkerhetsarbeid
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grunnleggende info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Øvelsesdetaljer</CardTitle>
            <CardDescription>Grunnleggende informasjon om øvelsen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Tittel <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="F.eks. Evakueringsøvelse bygg A — Q1 2026"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="drillType">
                  Type øvelse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.drillType}
                  onValueChange={(v) => set("drillType", v as FireDrillType)}
                >
                  <SelectTrigger id="drillType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FIRE_DRILL_TYPE_LABELS) as [FireDrillType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedDate">
                  Planlagt dato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plannedDate"
                  type="date"
                  value={form.plannedDate}
                  onChange={(e) => set("plannedDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">
                  Lokasjon / bygg <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="F.eks. Kontorbygg, Produksjonshall"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsibleId">
                  Øvingsleder <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.responsibleId}
                  onValueChange={(v) => set("responsibleId", v)}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="responsibleId">
                    <SelectValue placeholder="Velg øvingsleder" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((ut) => (
                      <SelectItem key={ut.user.id} value={ut.user.id}>
                        {ut.user.name ?? ut.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isAnnounced" className="text-sm font-medium">
                  Varslet øvelse
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slå av for uvarslet øvelse (gir mer realistisk respons)
                </p>
              </div>
              <Switch
                id="isAnnounced"
                checked={form.isAnnounced}
                onCheckedChange={(v) => set("isAnnounced", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mål og scenario — § 12 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mål og scenario</CardTitle>
            <CardDescription>
              § 12b/c/d: Definer hva som skal øves og hvorfor — brukes til evaluering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="objectives">
                Mål for øvelsen <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="objectives"
                value={form.objectives}
                onChange={(e) => set("objectives", e.target.value)}
                placeholder="Hva skal øves på? Hvem skal øves? Hva er forventet resultat?&#10;&#10;F.eks.: Alle ansatte i bygg A skal evakuere til samlingsplass innen 3 minutter. Øvingsleder verifiserer at alle er kommet seg ut."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Påkrevd — § 12: klare mål gjør det mulig å evaluere om øvelsen ble vellykket
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario-beskrivelse</Label>
              <Textarea
                id="scenario"
                value={form.scenario}
                onChange={(e) => set("scenario", e.target.value)}
                placeholder="Beskriv øvelsesstillingen. F.eks.: Antatt brannstart i 2. etasje, røykutvikling fra korridor."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskAssessment">Risikovurdering</Label>
              <Textarea
                id="riskAssessment"
                value={form.riskAssessment}
                onChange={(e) => set("riskAssessment", e.target.value)}
                placeholder="Anbefalt hvis det brukes reelle virkemidler (røyk, alarm). Beskriv mulige risikomomenter og forebyggende tiltak."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Anbefalt av Brannportal — spesielt ved bruk av røyk/alarm under øvelsen
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delte lokaler — § 4 tredje ledd */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Deler lokaler med andre virksomheter
            </CardTitle>
            <CardDescription>
              § 4 tredje ledd: Eieren av byggverket skal sikre at all bruk samordnes. Dokumenter
              koordineringen hvis virksomheten deler bygg med andre.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="sharedPremises" className="text-sm font-medium">
                  Deler virksomheten lokaler med andre?
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  F.eks. kontorfellesskap, kjøpesenter, næringsbygg med flere leietakere
                </p>
              </div>
              <Switch
                id="sharedPremises"
                checked={form.sharedPremises}
                onCheckedChange={(v) => set("sharedPremises", v)}
              />
            </div>

            {form.sharedPremises && (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-800">
                  Delt bygg krever samordning — dokumenter dette her (§ 4)
                </p>

                <div className="space-y-2">
                  <Label htmlFor="buildingOwnerName">
                    Byggeier / samordningsansvarlig
                  </Label>
                  <Input
                    id="buildingOwnerName"
                    value={form.buildingOwnerName}
                    onChange={(e) => set("buildingOwnerName", e.target.value)}
                    placeholder="Navn på gårdeier, driftsselskap eller fellesansvarlig"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalBuildingOccupants">
                    Totalt antall personer i bygget under øvelsen
                  </Label>
                  <Input
                    id="totalBuildingOccupants"
                    type="number"
                    min={1}
                    value={form.totalBuildingOccupants}
                    onChange={(e) => set("totalBuildingOccupants", e.target.value)}
                    placeholder="Inkluderer ansatte hos alle virksomheter og besøkende"
                  />
                  <p className="text-xs text-muted-foreground">
                    Påkrevd for korrekt § 13-dokumentasjon i delt bygg
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-white p-3">
                  <div>
                    <Label htmlFor="buildingOwnerCoordinated" className="text-sm font-medium">
                      Byggeier er koordinert og informert
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      § 4: eieren skal sikre samordning av all bruk
                    </p>
                  </div>
                  <Switch
                    id="buildingOwnerCoordinated"
                    checked={form.buildingOwnerCoordinated}
                    onCheckedChange={(v) => set("buildingOwnerCoordinated", v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-white p-3">
                  <div>
                    <Label htmlFor="otherTenantsInformed" className="text-sm font-medium">
                      Øvrige leietakere / virksomheter er informert
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      God praksis — hindrer unødig alarm hos nabovirksomheter
                    </p>
                  </div>
                  <Switch
                    id="otherTenantsInformed"
                    checked={form.otherTenantsInformed}
                    onCheckedChange={(v) => set("otherTenantsInformed", v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-white p-3">
                  <div>
                    <Label htmlFor="fullBuildingEvacuation" className="text-sm font-medium">
                      Felles evakueringsøvelse for hele bygget
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Slå på hvis øvelsen gjelder hele bygget, ikke bare egne lokaler
                    </p>
                  </div>
                  <Switch
                    id="fullBuildingEvacuation"
                    checked={form.fullBuildingEvacuation}
                    onCheckedChange={(v) => set("fullBuildingEvacuation", v)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/fire-drills">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Lagrer..." : "Planlegg øvelse"}
          </Button>
        </div>
      </form>
    </div>
  );
}
