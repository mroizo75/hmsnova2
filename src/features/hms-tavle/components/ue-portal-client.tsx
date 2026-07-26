"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Upload,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

type SubmissionType = "AVVIK" | "RUH" | "SJA" | "NESTENULYKKE" | "PDF_RAPPORT";

interface Props {
  portalToken: string;
  brandColor: string | null;
  logoUrl: string | null;
  tenantName: string;
  projectName: string | null | undefined;
  projectLocation: string | null | undefined;
  allowAvvik: boolean;
  allowRuh: boolean;
  allowSja: boolean;
  allowPdfUpload: boolean;
  requireEmail: boolean;
  publicToken: string;
}

const TYPE_CONFIG: Record<
  SubmissionType,
  { label: string; icon: React.ReactNode; desc: string; color: string }
> = {
  AVVIK: {
    label: "Avvik",
    icon: <AlertTriangle className="h-6 w-6" />,
    desc: "Farlig situasjon, skade, materiell skade eller avvik fra prosedyre",
    color: "text-orange-600",
  },
  RUH: {
    label: "RUH – Rapport om uønsket hendelse",
    icon: <FileText className="h-6 w-6" />,
    desc: "Nestenulykke, uønsket hendelse eller observasjon",
    color: "text-blue-600",
  },
  NESTENULYKKE: {
    label: "Nestenulykke",
    icon: <AlertTriangle className="h-6 w-6" />,
    desc: "Situasjon som nesten førte til ulykke",
    color: "text-yellow-600",
  },
  SJA: {
    label: "SJA – Sikker jobb-analyse",
    icon: <ClipboardCheck className="h-6 w-6" />,
    desc: "Send inn SJA-skjema for nytt eller pågående arbeid",
    color: "text-green-600",
  },
  PDF_RAPPORT: {
    label: "PDF-rapport fra eget system",
    icon: <Upload className="h-6 w-6" />,
    desc: "Last opp rapport fra eget HMS-system (Synergi, EHS Manager osv.)",
    color: "text-purple-600",
  },
};

interface FormData {
  submitterName: string;
  submitterEmail: string;
  company: string;
  orgNr: string;
  description: string;
  location: string;
  severity: string;
  immediateAction: string;
}

export function UePortalClient({
  portalToken,
  brandColor,
  logoUrl,
  tenantName,
  projectName,
  projectLocation,
  allowAvvik,
  allowRuh,
  allowSja,
  allowPdfUpload,
  requireEmail,
  publicToken,
}: Props) {
  const [step, setStep] = useState<"type" | "form" | "success">("type");
  const [selectedType, setSelectedType] = useState<SubmissionType | null>(null);
  const [form, setForm] = useState<FormData>({
    submitterName: "",
    submitterEmail: "",
    company: "",
    orgNr: "",
    description: "",
    location: "",
    severity: "MEDIUM",
    immediateAction: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const accentColor = brandColor ?? "#2563eb";

  const availableTypes: SubmissionType[] = [
    ...(allowAvvik ? (["AVVIK", "NESTENULYKKE"] as SubmissionType[]) : []),
    ...(allowRuh ? (["RUH"] as SubmissionType[]) : []),
    ...(allowSja ? (["SJA"] as SubmissionType[]) : []),
    ...(allowPdfUpload ? (["PDF_RAPPORT"] as SubmissionType[]) : []),
  ];

  function selectType(type: SubmissionType) {
    setSelectedType(type);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    if (!form.submitterName.trim()) return toast.error("Navn er påkrevd");
    if (requireEmail && !form.submitterEmail.trim()) return toast.error("E-post er påkrevd");

    setSubmitting(true);
    try {
      const data: Record<string, any> = {
        beskrivelse: form.description,
        sted: form.location,
        alvorlighetsgrad: form.severity,
        strakstiltak: form.immediateAction,
      };

      const res = await fetch(`/api/subcontractor/${portalToken}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          submitterName: form.submitterName,
          submitterEmail: form.submitterEmail || undefined,
          company: form.company || undefined,
          orgNr: form.orgNr || undefined,
          data,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved innsending");
      setSubmissionId(json.data?.id ?? "ok");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain" />}
        <div>
          <p className="font-semibold text-sm">{tenantName}</p>
          {projectName && <p className="text-xs text-muted-foreground">{projectName}</p>}
        </div>
        <Link
          href={`/tavle/${publicToken}`}
          className="ml-auto text-xs text-muted-foreground flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tilbake til tavlen
        </Link>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6 space-y-4">
        {/* Steg: velg type */}
        {step === "type" && (
          <>
            <div>
              <h1 className="text-2xl font-bold">Meld inn</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Velg hva du vil rapportere for{" "}
                <span className="font-medium">{projectName ?? tenantName}</span>.
              </p>
            </div>

            <div className="space-y-2">
              {availableTypes.map((type) => {
                const conf = TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => selectType(type)}
                    className="w-full text-left p-4 bg-white rounded-xl border hover:shadow-sm transition-all flex items-center gap-4"
                  >
                    <div className={conf.color}>{conf.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{conf.label}</p>
                      <p className="text-xs text-muted-foreground">{conf.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Steg: skjema */}
        {step === "form" && selectedType && (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("type")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{TYPE_CONFIG[selectedType].label}</h1>
                <p className="text-xs text-muted-foreground">Fyll ut skjemaet under</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dine opplysninger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>
                      Navn *
                    </Label>
                    <Input
                      value={form.submitterName}
                      onChange={(e) => setForm({ ...form, submitterName: e.target.value })}
                      placeholder="Ditt fulle navn"
                    />
                  </div>
                  {requireEmail && (
                    <div className="space-y-1.5">
                      <Label>E-post *</Label>
                      <Input
                        type="email"
                        value={form.submitterEmail}
                        onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
                        placeholder="din@epost.no"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Bedrift</Label>
                      <Input
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        placeholder="Firmanavn"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Org.nr</Label>
                      <Input
                        value={form.orgNr}
                        onChange={(e) => setForm({ ...form, orgNr: e.target.value })}
                        placeholder="9 siffer"
                        maxLength={9}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedType !== "PDF_RAPPORT" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hendelsesdetaljer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Beskrivelse</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Beskriv hva som skjedde eller ble observert..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sted / lokasjon</Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder={projectLocation ?? "Hvor skjedde dette?"}
                      />
                    </div>
                    {(selectedType === "AVVIK" || selectedType === "NESTENULYKKE" || selectedType === "RUH") && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Alvorlighetsgrad</Label>
                          <Select
                            value={form.severity}
                            onValueChange={(v) => setForm({ ...form, severity: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">Lav – liten konsekvens</SelectItem>
                              <SelectItem value="MEDIUM">Middels</SelectItem>
                              <SelectItem value="HIGH">Høy – alvorlig hendelse</SelectItem>
                              <SelectItem value="CRITICAL">Kritisk – personskade/dødsfall</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Strakstiltak iverksatt</Label>
                          <Textarea
                            value={form.immediateAction}
                            onChange={(e) =>
                              setForm({ ...form, immediateAction: e.target.value })
                            }
                            placeholder="Hva ble gjort umiddelbart?"
                            rows={2}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedType === "PDF_RAPPORT" && (
                <Card>
                  <CardContent className="p-5 text-center space-y-3">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">PDF-opplasting</p>
                    <p className="text-xs text-muted-foreground">
                      Beskriv hva rapporten inneholder, så kobler vi den til riktig avvik i systemet.
                    </p>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Beskriv rapportens innhold..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground italic">
                      Filvedlegg: send til e-post oppgitt av prosjektleder, eller last opp via lenke.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sender inn..." : "Send inn"}
              </Button>
            </form>
          </>
        )}

        {/* Steg: suksess */}
        {step === "success" && (
          <div className="text-center space-y-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold">Innsendt!</h1>
              <p className="text-muted-foreground mt-2">
                Takk for innmeldingen. Prosjektleder vil behandle den.
              </p>
            </div>
            {submissionId && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {submissionId}</p>
            )}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setStep("type");
                  setSelectedType(null);
                  setForm({
                    submitterName: "",
                    submitterEmail: "",
                    company: "",
                    orgNr: "",
                    description: "",
                    location: "",
                    severity: "MEDIUM",
                    immediateAction: "",
                  });
                }}
              >
                Meld inn nytt
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/tavle/${publicToken}`}>Tilbake til HMS-tavlen</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
