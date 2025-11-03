"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MultiStepProgress } from "@/features/document-generator/components/multi-step-progress";
import { step5Schema, type Step5Data, getIndustryLabel } from "@/features/document-generator/schemas/generator.schema";
import { createGeneratedDocument, generateDocuments, sendDocuments } from "@/server/actions/generator.actions";
import { CheckCircle2, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BekrefGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const form = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      confirmEmail: "",
      acceptPrivacy: false,
      marketingConsent: false,
    },
  });

  useEffect(() => {
    // Load all steps
    const step1 = localStorage.getItem("hms-generator-step1");
    const step2 = localStorage.getItem("hms-generator-step2");
    const step3 = localStorage.getItem("hms-generator-step3");
    const step4 = localStorage.getItem("hms-generator-step4");

    if (!step1 || !step2 || !step3 || !step4) {
      toast({
        title: "Feil",
        description: "Du må fylle ut alle steg først",
        variant: "destructive",
      });
      router.push("/gratis-hms-system/start");
      return;
    }

    const data = {
      step1: JSON.parse(step1),
      step2: JSON.parse(step2),
      step3: JSON.parse(step3),
      step4: JSON.parse(step4),
    };

    setSummary(data);
    form.setValue("confirmEmail", data.step1.email);
  }, [router, toast, form]);

  const onSubmit = async (data: Step5Data) => {
    if (!summary) return;

    setIsLoading(true);
    try {
      const completeData = {
        step1: summary.step1,
        step2: summary.step2,
        step3: summary.step3,
        step4: summary.step4,
        step5: data,
      };

      const result = await createGeneratedDocument(completeData);

      if (!result.success) {
        throw new Error(result.error);
      }

      const docId = result.data?.id;

      if (!docId) {
        throw new Error("Dokument-ID mangler");
      }

      // Generate documents
      await generateDocuments(docId);

      // Send email
      await sendDocuments(docId);

      // Clear localStorage
      localStorage.removeItem("hms-generator-step1");
      localStorage.removeItem("hms-generator-step2");
      localStorage.removeItem("hms-generator-step3");
      localStorage.removeItem("hms-generator-step4");

      // Redirect to success page
      router.push(`/gratis-hms-system/ferdig?id=${docId}`);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Noe gikk galt",
        description: error.message || "Kunne ikke generere HMS-system. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <MultiStepProgress currentStep={5} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Oppsummering</CardTitle>
                <CardDescription>
                  Se over informasjonen før vi genererer HMS-systemet ditt
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="space-y-4 mb-6 p-4 rounded-lg bg-muted/30 border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bedrift:</span>
                  <p className="font-medium">{summary.step1.companyName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Daglig leder:</span>
                  <p className="font-medium">{summary.step1.ceoName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ansatte:</span>
                  <p className="font-medium">{summary.step1.employeeRange}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bransje:</span>
                  <p className="font-medium">{getIndustryLabel(summary.step2.industry)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">E-post:</span>
                  <p className="font-medium">{summary.step1.email}</p>
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="space-y-3 mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Dette får du GRATIS:</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Ferdig HMS-håndbok (40 sider)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Risikovurdering med forhåndsdefinerte risikoer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Opplæringsplan og opplæringsmatrise</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Vernerunde-plan for 2025</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>AMU-møteplan og referat-maler</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>30+ ekstra skjemaer</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-primary/20 mt-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>Verdi: <span className="line-through">25.000 kr</span></span>
                  <Badge variant="default">GRATIS</Badge>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email confirmation */}
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">
                  Hvor skal vi sende dokumentene? <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  placeholder="din@epost.no"
                  {...form.register("confirmEmail")}
                />
                {form.formState.errors.confirmEmail && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmEmail.message}
                  </p>
                )}
              </div>

              {/* Privacy */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptPrivacy"
                    checked={form.watch("acceptPrivacy")}
                    onCheckedChange={(checked) => form.setValue("acceptPrivacy", checked as boolean)}
                  />
                  <label htmlFor="acceptPrivacy" className="text-sm cursor-pointer leading-tight">
                    Jeg godtar <a href="/personvern" target="_blank" className="underline">personvernerklæring</a>{" "}
                    <span className="text-destructive">*</span>
                  </label>
                </div>
                {form.formState.errors.acceptPrivacy && (
                  <p className="text-sm text-destructive ml-6">
                    {form.formState.errors.acceptPrivacy.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketingConsent"
                    checked={form.watch("marketingConsent")}
                    onCheckedChange={(checked) => form.setValue("marketingConsent", checked as boolean)}
                  />
                  <label htmlFor="marketingConsent" className="text-sm cursor-pointer leading-tight">
                    Send meg HMS-tips og nyheter (valgfritt)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/gratis-hms-system/opplaering")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Endre
                </Button>
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Genererer...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generer HMS-system!
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Steg 5 av 5 • Nesten ferdig!
        </div>
      </div>
    </div>
  );
}

