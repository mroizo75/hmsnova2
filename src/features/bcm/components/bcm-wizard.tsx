"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitBcmWizard } from "@/server/actions/bcm.actions";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = [
  { title: "Kritiske prosesser", description: "Hva er avgjørende for driften?" },
  { title: "Kriseteam", description: "Hvem tar ansvar ved en krise?" },
  { title: "Risikoscenarier", description: "Hvilke trusler er relevante?" },
  { title: "Gjenopprettingstiltak", description: "Hva gjøres for å komme i gang igjen?" },
  { title: "Fullfør", description: "Gjennomgå og publiser planen" },
];

const PROCESS_OPTIONS = [
  "Produksjon / leveranse",
  "IT-systemer og infrastruktur",
  "Kundeservice / support",
  "Forsyningskjede / logistikk",
  "Økonomi / fakturering",
  "Personalforvaltning / lønn",
  "Kommunikasjon (intern/ekstern)",
  "Salg og markedsføring",
  "Lager / varemottak",
];

const RISK_OPTIONS = [
  "Brann i lokaler",
  "IT-utfall / systemfeil",
  "Cyberangrep / datainnbrudd",
  "Strømbrudd (langvarig)",
  "Leverandørsvikt",
  "Pandemi / smitteutbrudd",
  "Naturkatastrofe (flom, storm)",
  "Nøkkelperson utilgjengelig",
  "Vannlekkasje / bygningsskade",
  "Transport- / logistikkbrudd",
];

interface CrisisTeamMember {
  name: string;
  role: string;
  phone: string;
  email: string;
  substitute: string;
}

export function BcmWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [criticalProcesses, setCriticalProcesses] = useState<string[]>([]);
  const [crisisTeam, setCrisisTeam] = useState<CrisisTeamMember[]>([
    { name: "", role: "", phone: "", email: "", substitute: "" },
  ]);
  const [riskScenarios, setRiskScenarios] = useState<string[]>([]);
  const [recoveryPlan, setRecoveryPlan] = useState("");
  const [communicationPlan, setCommunicationPlan] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  const toggleProcess = (process: string) => {
    setCriticalProcesses((prev) =>
      prev.includes(process) ? prev.filter((p) => p !== process) : [...prev, process],
    );
  };

  const toggleRisk = (risk: string) => {
    setRiskScenarios((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk],
    );
  };

  const addTeamMember = () => {
    setCrisisTeam((prev) => [...prev, { name: "", role: "", phone: "", email: "", substitute: "" }]);
  };

  const removeTeamMember = (index: number) => {
    setCrisisTeam((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: keyof CrisisTeamMember, value: string) => {
    setCrisisTeam((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return criticalProcesses.length > 0;
      case 1: return crisisTeam.some((m) => m.name && m.role && m.phone);
      case 2: return riskScenarios.length > 0;
      case 3: return recoveryPlan.trim().length > 20;
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitBcmWizard({
        criticalProcesses,
        crisisTeam: crisisTeam.filter((m) => m.name),
        riskScenarios,
        recoveryPlan,
        communicationPlan,
        nextReviewDate,
      });

      if (result.success) {
        toast({ title: "Beredskapsplan opprettet", description: "Planen er lagret som dokument under BCM." });
        queryClient.invalidateQueries({ queryKey: ["bcm"] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        onComplete();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Feil", description: "Kunne ikke opprette plan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </div>
          <Badge variant="secondary">Steg {step + 1} av {STEPS.length}</Badge>
        </div>
        <div className="flex gap-1 mt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {PROCESS_OPTIONS.map((process) => (
              <label
                key={process}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={criticalProcesses.includes(process)}
                  onCheckedChange={() => toggleProcess(process)}
                />
                <span className="text-sm">{process}</span>
              </label>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {crisisTeam.map((member, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Medlem {index + 1}</span>
                  {crisisTeam.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeTeamMember(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Navn</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                      placeholder="Ola Nordmann"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rolle i kriseteam</Label>
                    <Input
                      value={member.role}
                      onChange={(e) => updateTeamMember(index, "role", e.target.value)}
                      placeholder="Kriseleder / IT-ansvarlig"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobilnummer</Label>
                    <Input
                      value={member.phone}
                      onChange={(e) => updateTeamMember(index, "phone", e.target.value)}
                      placeholder="+47 900 00 000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-post</Label>
                    <Input
                      value={member.email}
                      onChange={(e) => updateTeamMember(index, "email", e.target.value)}
                      placeholder="ola@firma.no"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stedfortreder</Label>
                    <Input
                      value={member.substitute}
                      onChange={(e) => updateTeamMember(index, "substitute", e.target.value)}
                      placeholder="Kari Nordmann"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addTeamMember} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Legg til medlem
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {RISK_OPTIONS.map((risk) => (
              <label
                key={risk}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={riskScenarios.includes(risk)}
                  onCheckedChange={() => toggleRisk(risk)}
                />
                <span className="text-sm">{risk}</span>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Gjenopprettingstiltak</Label>
              <Textarea
                value={recoveryPlan}
                onChange={(e) => setRecoveryPlan(e.target.value)}
                placeholder={`For hvert valgt risikoscenario, beskriv:\n- Hva gjøres umiddelbart?\n- Hvem er ansvarlig?\n- Maks akseptabel nedetid (timer/dager)\n- Nødvendige ressurser\n\nEksempel:\nBrann i lokaler:\n- Evakuering iht. rømningsplan, ring 110\n- Ansvarlig: Daglig leder\n- Maks nedetid: 48 timer\n- Alternativ arbeidsplass: Hjemmekontor + samarbeidspartner`}
                rows={12}
              />
            </div>
            <div className="space-y-2">
              <Label>Kommunikasjonsplan (valgfritt)</Label>
              <Textarea
                value={communicationPlan}
                onChange={(e) => setCommunicationPlan(e.target.value)}
                placeholder="Hvem informeres og hvordan? Hvem uttaler seg til media?"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Neste gjennomgang av planen</Label>
              <Input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">Oppsummering</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kritiske prosesser:</span>
                  <span className="font-medium">{criticalProcesses.length} valgt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kriseteam:</span>
                  <span className="font-medium">{crisisTeam.filter((m) => m.name).length} medlemmer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risikoscenarier:</span>
                  <span className="font-medium">{riskScenarios.length} valgt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gjenopprettingsplan:</span>
                  <span className="font-medium">{recoveryPlan.length > 0 ? "Utfylt" : "Mangler"}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Planen lagres som et BCM-dokument i utkast-status. Du kan redigere og godkjenne den etterpå.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => step === 0 ? onComplete() : setStep(step - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? "Avbryt" : "Tilbake"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Neste
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
              <Check className="mr-2 h-4 w-4" />
              {submitting ? "Lagrer..." : "Opprett beredskapsplan"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
