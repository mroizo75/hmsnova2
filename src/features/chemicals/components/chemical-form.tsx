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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { createChemical, updateChemical } from "@/server/actions/chemical.actions";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  AlertTriangle,
  Package,
  FlaskConical,
  Shield,
  StickyNote,
  ChevronRight,
} from "lucide-react";
import type { Chemical } from "@prisma/client";
import { HazardPictogramSelector } from "./hazard-pictogram-selector";
import { PPESelector } from "./ppe-selector";

interface ChemicalFormProps {
  chemical?: Chemical;
  mode?: "create" | "edit";
}

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b">
      <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children, aiFilled = false }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  aiFilled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        {aiFilled && (
          <Badge variant="secondary" className="text-xs h-4 px-1.5 py-0">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            AI
          </Badge>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

function FlagRow({ id, name, checked, disabled, color, label, description }: {
  id: string;
  name: string;
  checked: boolean;
  disabled: boolean;
  color: "red" | "purple" | "orange";
  label: string;
  description: string;
}) {
  const colors = {
    red: {
      border: "border-red-200",
      bg: "bg-red-50",
      dot: "bg-red-500",
      label: "text-red-900",
      desc: "text-red-700",
    },
    purple: {
      border: "border-purple-200",
      bg: "bg-purple-50",
      dot: "bg-purple-500",
      label: "text-purple-900",
      desc: "text-purple-700",
    },
    orange: {
      border: "border-orange-200",
      bg: "bg-orange-50",
      dot: "bg-orange-500",
      label: "text-orange-900",
      desc: "text-orange-700",
    },
  }[color];

  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg} cursor-pointer hover:opacity-90 transition-opacity`}
    >
      <Checkbox
        id={id}
        name={name}
        disabled={disabled}
        defaultChecked={checked}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${colors.label} leading-tight`}>
          {label}
        </span>
        <span className={`block text-xs mt-1 leading-relaxed ${colors.desc} break-words`}>
          {description}
        </span>
      </div>
    </label>
  );
}

export function ChemicalForm({ chemical, mode = "create" }: ChemicalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sdsFile, setSdsFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const handleSDSUpload = async (file: File) => {
    setSdsFile(file);
    setParsing(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      const uploadRes = await fetch("/api/chemicals/upload", { method: "POST", body: uploadFormData });
      if (!uploadRes.ok) throw new Error("Filopplasting feilet");
      const { key } = await uploadRes.json();

      toast({ title: "AI analyserer sikkerhetsdatablad", description: "Dette tar ca. 30–60 sekunder..." });

      const parseRes = await fetch("/api/chemicals/parse-sds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdsKey: key }),
      });
      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || "AI-parsing feilet");
      }
      const { data } = await parseRes.json();
      setAiData(data);
      toast({
        title: "AI-analyse fullført",
        description: "Feltene er fylt ut automatisk – sjekk og juster om nødvendig",
        className: "bg-green-50 border-green-200",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Feil ved AI-parsing", description: error.message });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      let sdsKey: string | undefined;
      if (sdsFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", sdsFile);
        const uploadRes = await fetch("/api/chemicals/upload", { method: "POST", body: uploadFormData });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Filopplasting feilet");
        }
        sdsKey = (await uploadRes.json()).key;
      }

      const data = {
        productName: formData.get("productName") as string,
        supplier: (formData.get("supplier") as string) || undefined,
        casNumber: (formData.get("casNumber") as string) || undefined,
        hazardClass: (formData.get("hazardClass") as string) || undefined,
        hazardStatements: (formData.get("hazardStatements") as string) || undefined,
        precautionaryStatements: (formData.get("precautionaryStatements") as string) || undefined,
        warningPictograms: (formData.get("warningPictograms") as string) || undefined,
        requiredPPE: (formData.get("requiredPPE") as string) || undefined,
        containsIsocyanates: formData.get("containsIsocyanates") === "on",
        isCMR: formData.get("isCMR") === "on",
        isSVHC: formData.get("isSVHC") === "on",
        sdsKey: sdsKey || undefined,
        sdsVersion: (formData.get("sdsVersion") as string) || undefined,
        sdsDate: (formData.get("sdsDate") as string) || undefined,
        nextReviewDate: (formData.get("nextReviewDate") as string) || undefined,
        location: (formData.get("location") as string) || undefined,
        quantity: (formData.get("quantity") as string) || undefined,
        unit: (formData.get("unit") as string) || undefined,
        status: formData.get("status") as string,
        notes: (formData.get("notes") as string) || undefined,
      };

      const result = mode === "edit" && chemical
        ? await updateChemical(chemical.id, data)
        : await createChemical(data);

      if (result.success) {
        toast({
          title: mode === "edit" ? "Kjemikalie oppdatert" : "Kjemikalie registrert",
          description: mode === "edit" ? "Endringene er lagret" : "Produktet er lagt til i stoffkartoteket",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/chemicals");
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Feil", description: result.error || "Kunne ikke lagre" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Feil", description: error.message || "Noe gikk galt" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

        {/* ── 1. Sikkerhetsdatablad ─────────────────────────────────────── */}
        <div className="p-6 space-y-5">
          <SectionHeader
            icon={Upload}
            title="Sikkerhetsdatablad (SDS)"
            description="Last opp PDF – AI analyserer og fyller ut feltene under automatisk"
          />

          {/* AI-status */}
          {aiData && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
              <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                AI har fylt ut feltene – sjekk og juster om nødvendig
              </p>
            </div>
          )}
          {parsing && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800">AI analyserer sikkerhetsdatablad... ca. 30–60 sek</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <FieldRow
              label={`Datablad (PDF)${mode === "create" ? " *" : ""}`}
              hint={!chemical?.sdsKey && mode === "create" ? "AI fyller ut feltene automatisk ved opplasting" : undefined}
            >
              <Input
                id="sdsFile"
                type="file"
                accept=".pdf"
                disabled={loading || parsing}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSDSUpload(f); }}
                className="cursor-pointer"
              />
            </FieldRow>
            {chemical?.sdsKey && !sdsFile && (
              <div className="flex items-end pb-0.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground border rounded-md px-3 py-2 bg-slate-50 whitespace-nowrap">
                  <FileText className="h-4 w-4" />
                  Eksisterende datablad
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldRow label="Versjon">
              <Input id="sdsVersion" name="sdsVersion" placeholder="3.2" disabled={loading}
                defaultValue={chemical?.sdsVersion || ""} />
            </FieldRow>
            <FieldRow label="Dato for datablad">
              <Input id="sdsDate" name="sdsDate" type="date" disabled={loading}
                defaultValue={chemical?.sdsDate ? new Date(chemical.sdsDate).toISOString().split("T")[0] : ""} />
            </FieldRow>
            <FieldRow label="Neste revisjon" hint="Anbefalt: Årlig gjennomgang">
              <Input id="nextReviewDate" name="nextReviewDate" type="date" disabled={loading}
                defaultValue={
                  chemical?.nextReviewDate
                    ? new Date(chemical.nextReviewDate).toISOString().split("T")[0]
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                } />
            </FieldRow>
          </div>
        </div>

        <div className="border-t" />

        {/* ── 2. Produktinformasjon ─────────────────────────────────────── */}
        <div className="p-6 space-y-5">
          <SectionHeader
            icon={Package}
            title="Produktinformasjon"
            description="Grunnleggende data om kjemikaliet"
          />

          <FieldRow label="Produktnavn *" aiFilled={!!aiData?.productName}>
            <Input
              id="productName" name="productName" required disabled={loading}
              placeholder="F.eks. Rengjøringsmiddel XYZ"
              key={aiData?.productName || "pn"}
              defaultValue={aiData?.productName || chemical?.productName || ""}
            />
          </FieldRow>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Leverandør" aiFilled={!!aiData?.supplier}>
              <Input id="supplier" name="supplier" disabled={loading} placeholder="Leverandørnavn"
                key={aiData?.supplier || "sup"}
                defaultValue={aiData?.supplier || chemical?.supplier || ""} />
            </FieldRow>
            <FieldRow label="CAS-nummer" hint="Unikt identifikasjonsnummer for kjemisk stoff" aiFilled={!!aiData?.casNumber}>
              <Input id="casNumber" name="casNumber" disabled={loading} placeholder="000-00-0"
                key={aiData?.casNumber || "cas"}
                defaultValue={aiData?.casNumber || chemical?.casNumber || ""} />
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Lagringssted">
              <Input id="location" name="location" disabled={loading} placeholder="F.eks. Lager A, hylle 3"
                defaultValue={chemical?.location || ""} />
            </FieldRow>
            <FieldRow label="Status *">
              <Select name="status" required disabled={loading} defaultValue={chemical?.status || "ACTIVE"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">I bruk</SelectItem>
                  <SelectItem value="PHASED_OUT">Utfases</SelectItem>
                  <SelectItem value="ARCHIVED">Arkivert</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldRow label="Mengde">
              <Input id="quantity" name="quantity" type="number" step="0.01" disabled={loading}
                placeholder="0" defaultValue={chemical?.quantity || ""} />
            </FieldRow>
            <FieldRow label="Enhet">
              <Select name="unit" disabled={loading} defaultValue={chemical?.unit || "liter"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="liter">Liter</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="stk">Stykk</SelectItem>
                  <SelectItem value="m3">Kubikkmeter</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </div>

        <div className="border-t" />

        {/* ── 3. Faremarkering ─────────────────────────────────────────── */}
        <div className="p-6 space-y-5">
          <SectionHeader
            icon={FlaskConical}
            title="Faremarkering (GHS/CLP)"
            description="Klassifisering, H/P-setninger og varslingspiktogrammer fra sikkerhetsdatabladet"
          />

          <FieldRow label="Fareklasse" hint="GHS/CLP-fareklasse, f.eks. Flam. Liq. 3, Acute Tox. 4" aiFilled={!!aiData?.hazardClass}>
            <Input id="hazardClass" name="hazardClass" disabled={loading}
              placeholder="F.eks. Flam. Liq. 3"
              key={aiData?.hazardClass || "hc"}
              defaultValue={aiData?.hazardClass || chemical?.hazardClass || ""} />
          </FieldRow>

          <FieldRow
            label="H-setninger (faresetninger)"
            hint="H340 / H350 / H360 indikerer CMR-stoff → registreringsplikt i eksponeringsregisteret"
            aiFilled={!!aiData?.hazardStatements}
          >
            <Textarea
              id="hazardStatements" name="hazardStatements" rows={4} disabled={loading}
              placeholder={"H226 Brannfarlig væske og damp\nH315 Irriterer huden\nH350 Kan forårsake kreft"}
              key={aiData?.hazardStatements || "hs"}
              defaultValue={aiData?.hazardStatements || chemical?.hazardStatements || ""}
              className="resize-y min-h-[80px]"
            />
          </FieldRow>

          <FieldRow
            label="P-setninger (sikkerhetssetninger)"
            hint="Precautionary statements fra avsnitt 2 i sikkerhetsdatabladet"
            aiFilled={!!aiData?.precautionaryStatements}
          >
            <Textarea
              id="precautionaryStatements" name="precautionaryStatements" rows={4} disabled={loading}
              placeholder={"P210 Holdes vekk fra varme og åpen flamme\nP260 Ikke innånd støv/røyk/damp\nP501 Innhold/beholder leveres til godkjent avfallsmottak"}
              key={aiData?.precautionaryStatements || "ps"}
              defaultValue={aiData?.precautionaryStatements || chemical?.precautionaryStatements || ""}
              className="resize-y min-h-[80px]"
            />
          </FieldRow>

          <div>
            {aiData?.warningPictograms && (
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI-fylt
                </Badge>
              </div>
            )}
            <Label className="text-sm font-medium text-slate-700 block mb-2">Faresymboler (GHS)</Label>
            <HazardPictogramSelector
              key={aiData?.warningPictograms || "wp"}
              defaultValue={aiData?.warningPictograms || chemical?.warningPictograms || ""}
            />
          </div>

          {/* Klassifiseringsflagg */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium text-slate-700 block">Klassifiseringsflagg</Label>
            <FlagRow
              id="isCMR" name="isCMR" color="red" disabled={loading}
              checked={aiData?.isCMR ?? chemical?.isCMR ?? false}
              label="CMR-stoff (Carc./Mut./Repr. kat. 1A eller 1B)"
              description="Kreftfremkallende, mutagent eller reproduksjonstoksisk. Utløser registreringsplikt i eksponeringsregisteret (Arbeidstilsynet kap. 31)."
            />
            <FlagRow
              id="isSVHC" name="isSVHC" color="purple" disabled={loading}
              checked={aiData?.isSVHC ?? chemical?.isSVHC ?? false}
              label="SVHC – Substance of Very High Concern (REACH)"
              description="Stoff med svært høy bekymring i henhold til REACH-forordningen. Kan kreve tillatelse for bruk."
            />
            <FlagRow
              id="containsIsocyanates" name="containsIsocyanates" color="orange" disabled={loading}
              checked={aiData?.containsIsocyanates ?? chemical?.containsIsocyanates ?? false}
              label="Inneholder diisocyanater"
              description="Krever obligatorisk opplæring for brukere (EU-forordning 2020/1149). AI detekterer dette automatisk fra SDS."
            />
          </div>
        </div>

        <div className="border-t" />

        {/* ── 4. Verneutstyr ───────────────────────────────────────────── */}
        <div className="p-6 space-y-4">
          <SectionHeader
            icon={Shield}
            title="Personlig verneutstyr (PPE)"
            description="Påkrevd verneutstyr ved håndtering – ISO 7010-symboler"
          />
          {aiData?.requiredPPE && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI-foreslått
            </Badge>
          )}
          <PPESelector
            key={aiData?.requiredPPE || "ppe"}
            defaultValue={aiData?.requiredPPE || chemical?.requiredPPE || ""}
          />
        </div>

        <div className="border-t" />

        {/* ── 5. Notater ───────────────────────────────────────────────── */}
        <div className="p-6 space-y-4">
          <SectionHeader
            icon={StickyNote}
            title="Notater"
            description="Spesielle håndteringsinstruksjoner, substitusjonsvurderinger eller andre kommentarer"
          />
          <Textarea
            id="notes" name="notes" rows={4} disabled={loading}
            placeholder="F.eks. spesielle lagrings- eller håndteringskrav, planlagte erstatningsstoffer, etc."
            defaultValue={chemical?.notes || ""}
            className="resize-y"
          />
        </div>

        {/* ── Footer / actions ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            Fødselsnummer lagres aldri i stoffkartoteket
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={loading} onClick={() => router.back()}>
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={loading || (mode === "create" && !sdsFile)}
              className="min-w-[140px]"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Lagrer...</>
              ) : mode === "edit" ? (
                "Lagre endringer"
              ) : (
                "Registrer kjemikalie"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
