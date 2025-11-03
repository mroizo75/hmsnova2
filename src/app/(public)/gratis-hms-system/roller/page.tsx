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
import { MultiStepProgress } from "@/features/document-generator/components/multi-step-progress";
import { step3Schema, type Step3Data } from "@/features/document-generator/schemas/generator.schema";
import { ArrowRight, ArrowLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RollerGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Array<{ name: string; leader: string }>>([]);

  const form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      hmsResponsible: "",
      hmsEmail: "",
      hmsPhone: "",
      hmsIsCeo: false,
      hasSafetyRep: false,
      safetyRep: "",
      safetyRepEmail: "",
      safetyRepPhone: "",
      hasBHT: false,
      bhtProvider: "",
      bhtContact: "",
      departments: [],
    },
  });

  const hmsIsCeo = form.watch("hmsIsCeo");
  const hasSafetyRep = form.watch("hasSafetyRep");
  const hasBHT = form.watch("hasBHT");

  useEffect(() => {
    const step1Data = localStorage.getItem("hms-generator-step1");
    if (!step1Data) {
      router.push("/gratis-hms-system/start");
      return;
    }

    // Last inn eksisterende step 3 data hvis den finnes (kun første gang)
    const step3Data = localStorage.getItem("hms-generator-step3");
    if (step3Data) {
      try {
        const parsedData = JSON.parse(step3Data);
        Object.keys(parsedData).forEach((key) => {
          form.setValue(key as keyof Step3Data, parsedData[key]);
        });
      } catch (error) {
        console.error("Failed to load step 3 data:", error);
      }
    }
    
    // Pre-fill HMS-ansvarlig med CEO data hvis checked
    if (hmsIsCeo) {
      const data = JSON.parse(step1Data);
      form.setValue("hmsResponsible", data.ceoName);
      form.setValue("hmsEmail", data.email);
      form.setValue("hmsPhone", data.phone || "");
    }
  }, [hmsIsCeo, router, form]);

  const onSubmit = async (data: Step3Data) => {
    setIsLoading(true);
    try {
      localStorage.setItem("hms-generator-step3", JSON.stringify(data));
      router.push("/gratis-hms-system/opplaering");
    } catch (error) {
      toast({
        title: "Noe gikk galt",
        description: "Kunne ikke lagre data. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <MultiStepProgress currentStep={3} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">HMS-organisering</CardTitle>
                <CardDescription>Hvem har HMS-ansvar i bedriften?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* HMS-ansvarlig */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  HMS-ansvarlig <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Dette er personen som koordinerer HMS-arbeidet.
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hmsIsCeo"
                    checked={hmsIsCeo}
                    onCheckedChange={(checked) => form.setValue("hmsIsCeo", checked as boolean)}
                  />
                  <label htmlFor="hmsIsCeo" className="text-sm cursor-pointer">
                    HMS-ansvarlig er samme som daglig leder
                  </label>
                </div>

                {hmsIsCeo && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-sm text-muted-foreground">
                      ✅ Bruker daglig leder sine kontaktopplysninger fra steg 1
                    </p>
                  </div>
                )}

                {!hmsIsCeo && (
                  <>
                    <div>
                      <Input
                        placeholder="Navn på HMS-ansvarlig"
                        {...form.register("hmsResponsible")}
                      />
                      {form.formState.errors.hmsResponsible && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.hmsResponsible.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="E-post"
                        {...form.register("hmsEmail")}
                      />
                      {form.formState.errors.hmsEmail && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.hmsEmail.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Telefon"
                        {...form.register("hmsPhone")}
                      />
                      {form.formState.errors.hmsPhone && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.hmsPhone.message}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Verneombud */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasSafetyRep"
                    checked={hasSafetyRep}
                    onCheckedChange={(checked) => form.setValue("hasSafetyRep", checked as boolean)}
                  />
                  <label htmlFor="hasSafetyRep" className="text-sm font-semibold cursor-pointer">
                    Vi har verneombud
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lovpålagt fra 10 ansatte, anbefalt fra 5+
                </p>

                {hasSafetyRep && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <Input
                        placeholder="Navn på verneombud"
                        {...form.register("safetyRep")}
                      />
                      {form.formState.errors.safetyRep && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.safetyRep.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="E-post"
                        {...form.register("safetyRepEmail")}
                      />
                      {form.formState.errors.safetyRepEmail && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.safetyRepEmail.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Telefon"
                        {...form.register("safetyRepPhone")}
                      />
                      {form.formState.errors.safetyRepPhone && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.safetyRepPhone.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BHT */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasBHT"
                    checked={hasBHT}
                    onCheckedChange={(checked) => form.setValue("hasBHT", checked as boolean)}
                  />
                  <label htmlFor="hasBHT" className="text-sm font-semibold cursor-pointer">
                    Vi har BHT-avtale
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bedriftshelsetjeneste (lovpålagt for alle bedrifter - AML §3-3)
                </p>

                {hasBHT && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <Input
                        placeholder="BHT-leverandør (f.eks. Dr. Dropin)"
                        {...form.register("bhtProvider")}
                      />
                      {form.formState.errors.bhtProvider && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.bhtProvider.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Kontaktperson hos BHT"
                        {...form.register("bhtContact")}
                      />
                      {form.formState.errors.bhtContact && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.bhtContact.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!hasBHT && (
                  <div className="ml-6 rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-sm">
                      💡 HMS Nova kan hjelpe deg finne BHT!
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/gratis-hms-system/bransje")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Tilbake
                </Button>
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? "Lagrer..." : "Neste: Opplæring"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Steg 3 av 5 • ~10 minutter igjen
        </div>
      </div>
    </div>
  );
}

