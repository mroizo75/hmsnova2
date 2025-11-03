"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MultiStepProgress } from "@/features/document-generator/components/multi-step-progress";
import { 
  step2Schema, 
  type Step2Data, 
  INDUSTRY_OPTIONS 
} from "@/features/document-generator/schemas/generator.schema";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function BransjeGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      industry: "CONSTRUCTION",
      companyDescription: "",
    },
  });

  const selectedIndustry = form.watch("industry");

  // Load step 1 data (validering) og step 2 hvis den eksisterer
  useEffect(() => {
    const step1Data = localStorage.getItem("hms-generator-step1");
    if (!step1Data) {
      toast({
        title: "Feil",
        description: "Du må fylle ut steg 1 først",
        variant: "destructive",
      });
      router.push("/gratis-hms-system/start");
      return;
    }

    // Last inn eksisterende step 2 data hvis den finnes
    const step2Data = localStorage.getItem("hms-generator-step2");
    if (step2Data) {
      try {
        const parsedData = JSON.parse(step2Data);
        Object.keys(parsedData).forEach((key) => {
          form.setValue(key as keyof Step2Data, parsedData[key]);
        });
      } catch (error) {
        console.error("Failed to load step 2 data:", error);
      }
    }
  }, [router, toast, form]);

  const onSubmit = async (data: Step2Data) => {
    setIsLoading(true);
    try {
      localStorage.setItem("hms-generator-step2", JSON.stringify(data));
      router.push("/gratis-hms-system/roller");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Noe gikk galt",
        description: "Kunne ikke lagre data. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.push("/gratis-hms-system/start");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <MultiStepProgress currentStep={2} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Velg bransje</CardTitle>
                <CardDescription>
                  Vi tilpasser HMS-systemet til din bransje
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Industry Selection */}
              <div className="space-y-3">
                <Label>
                  Velg bransje <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {INDUSTRY_OPTIONS.map((option) => {
                    const isSelected = selectedIndustry === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "relative flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all hover:border-primary",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-muted bg-background"
                        )}
                      >
                        <input
                          type="radio"
                          value={option.value}
                          {...form.register("industry")}
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{option.label}</span>
                          <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                            {option.riskCount} risikoer
                          </Badge>
                        </div>
                        {isSelected && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Vi legger automatisk inn {option.riskCount} vanlige risikoer for denne bransjen
                          </p>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Company Description */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription">
                  Beskriv kort hva dere gjør (valgfritt)
                </Label>
                <Textarea
                  id="companyDescription"
                  placeholder="F.eks: Vi driver med nybygg av eneboliger og leiligheter..."
                  rows={4}
                  maxLength={500}
                  {...form.register("companyDescription")}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimum 500 tegn. Dette hjelper oss tilpasse dokumentene enda bedre.
                </p>
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      💡 Automatisk tilpasning
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vi legger automatisk inn alle vanlige risikoer for din bransje.
                      Du kan justere disse senere!
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={goBack}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Tilbake
                </Button>
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? "Lagrer..." : "Neste: HMS-roller"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Steg 2 av 5 • ~15 minutter igjen
        </div>
      </div>
    </div>
  );
}

