"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/shared/signature-pad";
import { ArrowLeft, Send, Save, ShieldCheck, Camera, Paperclip, X, ImageIcon, MessageSquarePlus, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  options?: string[];
}

interface FormFillerProps {
  form: {
    id: string;
    title: string;
    description?: string;
    requiresSignature: boolean;
    requiresApproval: boolean;
    fields: FormField[];
    isAnonymous?: boolean;
  };
  userId: string;
  tenantId: string;
  returnUrl?: string;
  inspectionId?: string;
  projects?: Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
  initialProjectId?: string;
  /** Satt når bruker kommer fra «Vis alle maler» – må sendes til API ved innsending */
  industryScopeBypass?: boolean;
}

interface InlineInspectionFindingDraft {
  title: string;
  description: string;
  severity: number;
  location: string;
  imageKeys: string[];
}

function getMultiCheckboxSelected(stored: string | undefined): string[] {
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function toggleMultiCheckbox(stored: string | undefined, option: string): string {
  const current = getMultiCheckboxSelected(stored);
  const exists = current.includes(option);
  return JSON.stringify(exists ? current.filter((v) => v !== option) : [...current, option]);
}

function isNotOkAnswer(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("ikke ok") ||
    normalized === "ikke_ok" ||
    normalized === "not ok" ||
    normalized === "not_ok" ||
    normalized === "nei" ||
    normalized === "no" ||
    normalized === "avvik" ||
    normalized === "fail" ||
    normalized === "failed" ||
    normalized === "non-compliant" ||
    normalized === "non_compliant"
  );
}

function clampSeverity(value: number): number {
  return Math.max(1, Math.min(5, value));
}

export function FormFiller({
  form,
  userId,
  tenantId,
  returnUrl = "/dashboard",
  inspectionId,
  projects = [],
  initialProjectId,
  industryScopeBypass = false,
}: FormFillerProps) {
  const isAnonymous = form.isAnonymous ?? false;
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (!initialProjectId) {
      return {};
    }

    const projectField = form.fields.find((field) => field.type === "PROJECT");
    if (!projectField) {
      return {};
    }

    return { [projectField.id]: initialProjectId };
  });
  const [signature, setSignature] = useState<string>("");
  const [files, setFiles] = useState<Record<string, File>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const findingImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [inlineInspectionFindings, setInlineInspectionFindings] = useState<
    Record<string, InlineInspectionFindingDraft>
  >({});
  const [uploadingFindingFieldId, setUploadingFindingFieldId] = useState<string | null>(null);

  // Merknader er alltid tilgjengelig i vernerunde-kontekst (inspectionId satt)
  const showComments = !!inspectionId;

  function handleCommentChange(fieldId: string, value: string) {
    setFieldComments((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleComment(fieldId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  }

  function handleFieldChange(fieldId: string, value: string) {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function getInlineFindingDraft(fieldId: string, fieldLabel: string): InlineInspectionFindingDraft {
    return (
      inlineInspectionFindings[fieldId] ?? {
        title: fieldLabel,
        description: "",
        severity: 3,
        location: "",
        imageKeys: [],
      }
    );
  }

  function updateInlineFindingDraft(
    fieldId: string,
    fieldLabel: string,
    patch: Partial<InlineInspectionFindingDraft>
  ) {
    setInlineInspectionFindings((prev) => {
      const current = getInlineFindingDraft(fieldId, fieldLabel);
      return {
        ...prev,
        [fieldId]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  async function uploadInlineFindingImages(
    fieldId: string,
    fieldLabel: string,
    filesToUpload: FileList | null
  ) {
    if (!inspectionId || !filesToUpload || filesToUpload.length === 0) {
      return;
    }
    setUploadingFindingFieldId(fieldId);
    try {
      const uploadedKeys: string[] = [];
      for (const file of Array.from(filesToUpload)) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("inspectionId", inspectionId);

        const response = await fetch("/api/inspections/upload", {
          method: "POST",
          body: uploadFormData,
        });
        const result = (await response.json()) as {
          data?: { key?: string };
          message?: string;
        };
        if (!response.ok || !result.data?.key) {
          throw new Error(result.message || "Kunne ikke laste opp bilde");
        }
        uploadedKeys.push(result.data.key);
      }

      const currentDraft = getInlineFindingDraft(fieldId, fieldLabel);
      updateInlineFindingDraft(fieldId, fieldLabel, {
        imageKeys: [...currentDraft.imageKeys, ...uploadedKeys],
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Feil ved bildeopplasting",
        description: "Kunne ikke laste opp bilde for funnet.",
      });
    } finally {
      setUploadingFindingFieldId(null);
    }
  }

  async function removeInlineFindingImage(fieldId: string, fieldLabel: string, imageKey: string) {
    try {
      await fetch("/api/inspections/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: imageKey }),
      });

      const currentDraft = getInlineFindingDraft(fieldId, fieldLabel);
      updateInlineFindingDraft(fieldId, fieldLabel, {
        imageKeys: currentDraft.imageKeys.filter((key) => key !== imageKey),
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke fjerne bilde.",
      });
    }
  }

  function handleFileChange(fieldId: string, file: File | null) {
    // Frigjør gammel preview-URL
    if (imagePreviews[fieldId]) {
      URL.revokeObjectURL(imagePreviews[fieldId]);
    }

    if (file) {
      setFiles((prev) => ({ ...prev, [fieldId]: file }));
      if (isImageFile(file)) {
        setImagePreviews((prev) => ({ ...prev, [fieldId]: createObjectUrl(file) }));
      } else {
        setImagePreviews((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    } else {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      setImagePreviews((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function handleSignature(dataUrl: string) {
    setSignature(dataUrl);
    toast({
      title: "✅ Signatur lagret",
      description: "Din signatur er registrert",
    });
  }

  async function handleSaveDraft() {
    await submitForm("DRAFT");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitForm("SUBMITTED");
  }

  async function submitForm(status: "DRAFT" | "SUBMITTED") {
    // Validering
    if (status === "SUBMITTED") {
      const requiredFields = form.fields.filter((f) => f.isRequired);
      for (const field of requiredFields) {
        const isMultiCheckbox = field.type === "CHECKBOX" && field.options && field.options.length > 0;
        const isEmpty = isMultiCheckbox
          ? getMultiCheckboxSelected(formValues[field.id]).length === 0
          : !formValues[field.id];
        if (isEmpty) {
          toast({
            title: "❌ Manglende felt",
            description: `"${field.label}" er påkrevd`,
            variant: "destructive",
          });
          return;
        }
      }

      if (form.requiresSignature && !signature) {
        toast({
          title: "❌ Manglende signatur",
          description: "Du må signere skjemaet før innsending",
          variant: "destructive",
        });
        return;
      }

      if (inspectionId) {
        for (const field of form.fields) {
          const answer = formValues[field.id];
          if (!isNotOkAnswer(answer)) {
            continue;
          }

          const draft = getInlineFindingDraft(field.id, field.label);
          const description = draft.description.trim() || (fieldComments[field.id] || "").trim();
          if (!description) {
            toast({
              title: "❌ Mangler funnbeskrivelse",
              description: `Du har valgt "Ikke OK" på "${field.label}", men mangler beskrivelse av funnet.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Lag FormData for fil-opplasting
      const formData = new FormData();
      formData.append("formId", form.id);
      formData.append("tenantId", tenantId);
      if (industryScopeBypass) {
        formData.append("industryScopeBypass", "1");
      }
      if (!isAnonymous) {
        formData.append("userId", userId);
      }
      formData.append("status", status);
      if (inspectionId) {
        formData.append("inspectionId", inspectionId);
      }
      formData.append("values", JSON.stringify(formValues));
      // Send merknader for alle felt som har tekst
      const nonEmptyComments = Object.fromEntries(
        Object.entries(fieldComments).filter(([, v]) => v.trim() !== "")
      );
      if (Object.keys(nonEmptyComments).length > 0) {
        formData.append("fieldComments", JSON.stringify(nonEmptyComments));
      }
      if (status === "SUBMITTED" && inspectionId) {
        const inspectionFindings = form.fields
          .filter((field) => isNotOkAnswer(formValues[field.id]))
          .map((field) => {
            const draft = getInlineFindingDraft(field.id, field.label);
            return {
              fieldId: field.id,
              fieldLabel: field.label,
              answer: formValues[field.id] ?? "",
              title: (draft.title || field.label).trim(),
              description: (draft.description || fieldComments[field.id] || "").trim(),
              severity: clampSeverity(draft.severity || 3),
              location: draft.location.trim(),
              imageKeys: draft.imageKeys,
            };
          });

        if (inspectionFindings.length > 0) {
          formData.append("inspectionFindings", JSON.stringify(inspectionFindings));
        }
      }
      if (signature) {
        formData.append("signature", signature);
      }

      // Legg til filer
      Object.entries(files).forEach(([fieldId, file]) => {
        formData.append(`file_${fieldId}`, file);
      });

      const response = await fetch("/api/forms/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Kunne ikke sende inn skjema");
      }

      toast({
        title: status === "DRAFT" ? "💾 Kladd lagret" : "✅ Skjema sendt inn",
        description: status === "DRAFT" 
          ? "Du kan fortsette senere" 
          : form.requiresApproval 
            ? "Venter på godkjenning fra leder"
            : inspectionId
              ? "Skjema sendt inn med funn registrert direkte i punktene."
              : "Takk for at du fylte ut skjemaet",
      });

      router.push(returnUrl);
      router.refresh();
    } catch (error) {
      toast({
        title: "❌ Feil",
        description: "Kunne ikke sende inn skjema. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={returnUrl}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground mt-1">{form.description}</p>
          )}
        </div>
      </div>

      {isAnonymous && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Anonym kartlegging
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                  Dine svar lagres anonymt. Ingen kan se hvem som har svart. Dette sikrer trygghet og ærlige svar i tråd med arbeidsmiljøloven.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form fields */}
        {form.fields.map((field) => {
          // SECTION_HEADER vises ikke som et felt, men som en overskrift
          if (field.type === "SECTION_HEADER") {
            return (
              <div key={field.id} className="mt-8 mb-4">
                <h2 className="text-2xl font-bold text-primary border-b-2 border-primary pb-2">
                  {field.label}
                </h2>
                {field.helpText && (
                  <p className="text-muted-foreground mt-2">{field.helpText}</p>
                )}
              </div>
            );
          }

          return (
          <Card key={field.id}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label className="text-base">
                  {field.label}
                  {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground">{field.helpText}</p>
                )}

                {/* LIKERT_SCALE */}
                {field.type === "LIKERT_SCALE" && (
                  <div className="space-y-3">
                    <RadioGroup
                      value={formValues[field.id] || ""}
                      onValueChange={(value) => handleFieldChange(field.id, value)}
                      required={field.isRequired}
                      className="flex justify-between items-center gap-2"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <div key={value} className="flex flex-col items-center flex-1">
                          <RadioGroupItem 
                            value={value.toString()} 
                            id={`${field.id}-${value}`} 
                            className="mb-2"
                          />
                          <Label 
                            htmlFor={`${field.id}-${value}`} 
                            className="cursor-pointer text-center font-semibold text-lg"
                          >
                            {value}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="flex justify-between text-xs text-muted-foreground px-2">
                      <span>Svært uenig</span>
                      <span>Nøytral</span>
                      <span>Svært enig</span>
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {field.type === "TEXT" && (
                  <Input
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.isRequired}
                  />
                )}

                {/* TEXTAREA */}
                {field.type === "TEXTAREA" && (
                  <Textarea
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.isRequired}
                    rows={4}
                  />
                )}

                {/* NUMBER */}
                {field.type === "NUMBER" && (
                  <Input
                    type="number"
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.isRequired}
                  />
                )}

                {/* DATE */}
                {field.type === "DATE" && (
                  <Input
                    type="date"
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    required={field.isRequired}
                  />
                )}

                {/* DATETIME */}
                {field.type === "DATETIME" && (
                  <Input
                    type="datetime-local"
                    value={formValues[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    required={field.isRequired}
                  />
                )}

                {/* PROJECT */}
                {field.type === "PROJECT" && (
                  <Select
                    value={formValues[field.id] || "NONE"}
                    onValueChange={(value) => handleFieldChange(field.id, value === "NONE" ? "" : value)}
                    required={field.isRequired}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg prosjekt..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Velg prosjekt...</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                          {project.code ? ` (${project.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* CHECKBOX – enkelt (ingen options) */}
                {field.type === "CHECKBOX" && (!field.options || field.options.length === 0) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={formValues[field.id] === "true"}
                      onCheckedChange={(checked) =>
                        handleFieldChange(field.id, checked ? "true" : "false")
                      }
                      required={field.isRequired}
                    />
                    <Label htmlFor={field.id} className="cursor-pointer">
                      Ja
                    </Label>
                  </div>
                )}

                {/* CHECKBOX – flervalg (med options) */}
                {field.type === "CHECKBOX" && field.options && field.options.length > 0 && (
                  <div className="space-y-2">
                    {field.options.map((option) => {
                      const selected = getMultiCheckboxSelected(formValues[field.id]);
                      const isChecked = selected.includes(option);
                      return (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.id}-${option}`}
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleFieldChange(field.id, toggleMultiCheckbox(formValues[field.id], option))
                            }
                          />
                          <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer font-normal">
                            {option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* RADIO */}
                {field.type === "RADIO" && field.options && (
                  <RadioGroup
                    value={formValues[field.id] || ""}
                    onValueChange={(value) => handleFieldChange(field.id, value)}
                    required={field.isRequired}
                  >
                    {field.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                        <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* SELECT */}
                {field.type === "SELECT" && field.options && (
                  <Select
                    value={formValues[field.id] || "NONE"}
                    onValueChange={(value) => handleFieldChange(field.id, value === "NONE" ? "" : value)}
                    required={field.isRequired}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Velg...</SelectItem>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* FILE / BILDE */}
                {field.type === "FILE" && (
                  <div className="space-y-3">
                    {/* Skjult vanlig fil-input */}
                    <input
                      ref={(el) => { cameraInputRefs.current[`file-${field.id}`] = el; }}
                      id={`file-${field.id}`}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                    />
                    {/* Skjult kamera-input (åpner bakvendt kamera) */}
                    <input
                      ref={(el) => { cameraInputRefs.current[`camera-${field.id}`] = el; }}
                      id={`camera-${field.id}`}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                    />

                    {/* Valgt fil / bilde-preview */}
                    {files[field.id] ? (
                      <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
                        {imagePreviews[field.id] ? (
                          <img
                            src={imagePreviews[field.id]}
                            alt="Forhåndsvisning"
                            className="w-full max-h-64 object-contain bg-black/5"
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3">
                            <Paperclip className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{files[field.id].name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFileChange(field.id, null)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                          aria-label="Fjern fil"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-muted-foreground px-3 pb-2 pt-1 truncate">
                          {files[field.id].name}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>Ingen fil valgt</p>
                      </div>
                    )}

                    {/* Knapper */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => cameraInputRefs.current[`camera-${field.id}`]?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Ta bilde
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => cameraInputRefs.current[`file-${field.id}`]?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Velg fil
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {inspectionId && isNotOkAnswer(formValues[field.id]) && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-3">
                  <div className="text-xs font-semibold text-red-900">
                    Funn for punktet (Ikke OK)
                  </div>
                  {(() => {
                    const draft = getInlineFindingDraft(field.id, field.label);
                    return (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Funn-tittel</Label>
                          <Input
                            value={draft.title}
                            onChange={(event) =>
                              updateInlineFindingDraft(field.id, field.label, { title: event.target.value })
                            }
                            placeholder="Kort tittel på funnet"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Beskrivelse av funn <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            value={draft.description}
                            onChange={(event) =>
                              updateInlineFindingDraft(field.id, field.label, { description: event.target.value })
                            }
                            placeholder="Beskriv hva som er avviket og hva som ble observert"
                            rows={3}
                            className="text-sm resize-none"
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Alvorlighet (1-5)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={draft.severity}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                if (!Number.isFinite(nextValue)) return;
                                updateInlineFindingDraft(field.id, field.label, {
                                  severity: clampSeverity(nextValue),
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Lokasjon</Label>
                            <Input
                              value={draft.location}
                              onChange={(event) =>
                                updateInlineFindingDraft(field.id, field.label, { location: event.target.value })
                              }
                              placeholder="F.eks. Lager 2"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Bilder (valgfritt)</Label>
                          <input
                            ref={(el) => {
                              findingImageInputRefs.current[field.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) =>
                              uploadInlineFindingImages(field.id, field.label, event.target.files)
                            }
                            disabled={uploadingFindingFieldId === field.id}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => findingImageInputRefs.current[field.id]?.click()}
                            disabled={uploadingFindingFieldId === field.id}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {uploadingFindingFieldId === field.id ? "Laster opp..." : "Legg til bilde"}
                          </Button>
                          {draft.imageKeys.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {draft.imageKeys.map((imageKey) => (
                                <div key={imageKey} className="relative">
                                  <img
                                    src={`/api/inspections/images/${imageKey}`}
                                    alt="Funnbilde"
                                    className="h-20 w-full rounded border object-cover"
                                  />
                                  <button
                                    type="button"
                                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                                    onClick={() => removeInlineFindingImage(field.id, field.label, imageKey)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Merknad per punkt – vises i vernerunde-kontekst */}
              {showComments && (
                <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
                  {expandedComments.has(field.id) || fieldComments[field.id] ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Merknad (valgfritt)
                      </Label>
                      <Textarea
                        value={fieldComments[field.id] || ""}
                        onChange={(e) => handleCommentChange(field.id, e.target.value)}
                        placeholder="Skriv inn merknad, avvik eller observasjon for dette punktet…"
                        rows={2}
                        className="text-sm resize-none"
                        autoFocus={expandedComments.has(field.id) && !fieldComments[field.id]}
                      />
                      {!fieldComments[field.id] && (
                        <button
                          type="button"
                          onClick={() => toggleComment(field.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Lukk merknad
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleComment(field.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      Legg til merknad
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}

        {/* Signature */}
        {form.requiresSignature && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Digital signatur
                  <span className="text-destructive ml-1">*</span>
                </span>
                {signature && (
                  <Badge variant="default" className="bg-green-600">
                    ✅ Signatur bekreftet
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignaturePad onSave={handleSignature} initialValue={signature} />
              {signature && (
                <p className="text-sm text-green-600 mt-3 font-medium">
                  ✓ Din signatur er lagret og vil bli inkludert i skjemaet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 sticky bottom-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            size="lg"
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Lagre kladd
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="flex-1"
          >
            {isSubmitting ? (
              "Sender inn..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send inn
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

