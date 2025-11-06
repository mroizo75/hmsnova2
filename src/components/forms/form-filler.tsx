"use client";

import { useState } from "react";
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
import { SignaturePad } from "./signature-pad";
import { ArrowLeft, Send, Save, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
  };
  userId: string;
  tenantId: string;
  returnUrl?: string;
}

export function FormFiller({ form, userId, tenantId, returnUrl = "/dashboard/forms" }: FormFillerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string>("");
  const [files, setFiles] = useState<Record<string, File>>({});

  function handleFieldChange(fieldId: string, value: string) {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleFileChange(fieldId: string, file: File | null) {
    if (file) {
      setFiles((prev) => ({ ...prev, [fieldId]: file }));
    } else {
      setFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
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
        if (!formValues[field.id]) {
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
    }

    setIsSubmitting(true);

    try {
      // Lag FormData for fil-opplasting
      const formData = new FormData();
      formData.append("formId", form.id);
      formData.append("tenantId", tenantId);
      formData.append("userId", userId);
      formData.append("status", status);
      formData.append("values", JSON.stringify(formValues));
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
        <div>
          <h1 className="text-3xl font-bold">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground mt-1">{form.description}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form fields */}
        {form.fields.map((field) => (
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

                {/* CHECKBOX */}
                {field.type === "CHECKBOX" && (
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

                {/* FILE */}
                {field.type === "FILE" && (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                      required={field.isRequired}
                    />
                    {files[field.id] && (
                      <p className="text-sm text-muted-foreground">
                        📎 {files[field.id].name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

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

