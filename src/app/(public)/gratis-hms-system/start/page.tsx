"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiStepProgress } from "@/features/document-generator/components/multi-step-progress";
import { step1Schema, type Step1Data, EmployeeRangeEnum } from "@/features/document-generator/schemas/generator.schema";
import { ArrowRight, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StartGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      companyName: "",
      orgNumber: "",
      address: "",
      postalCode: "",
      city: "",
      ceoName: "",
      email: "",
      phone: "",
      employeeRange: "1-5",
    },
  });

  // Last inn eksisterende data fra localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("hms-generator-step1");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        Object.keys(parsedData).forEach((key) => {
          form.setValue(key as keyof Step1Data, parsedData[key]);
        });
      } catch (error) {
        console.error("Failed to load saved data:", error);
      }
    }
  }, [form]);

  const onSubmit = async (data: Step1Data) => {
    setIsLoading(true);
    try {
      // Lagre til localStorage (eller session storage)
      localStorage.setItem("hms-generator-step1", JSON.stringify(data));
      
      // Naviger til neste steg
      router.push("/gratis-hms-system/bransje");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <MultiStepProgress currentStep={1} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bedriftsinformasjon</CardTitle>
                <CardDescription>
                  Dette tar kun 2 minutter
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Bedriftsnavn */}
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Bedriftsnavn <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Byggmester AS"
                  {...form.register("companyName")}
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              {/* Organisasjonsnummer */}
              <div className="space-y-2">
                <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
                <Input
                  id="orgNumber"
                  placeholder="123 456 789"
                  {...form.register("orgNumber")}
                />
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Storgata 1"
                  {...form.register("address")}
                />
              </div>

              {/* Postnummer og Poststed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postnummer</Label>
                  <Input
                    id="postalCode"
                    placeholder="0123"
                    {...form.register("postalCode")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Poststed</Label>
                  <Input
                    id="city"
                    placeholder="Oslo"
                    {...form.register("city")}
                  />
                </div>
              </div>

              {/* Daglig leder */}
              <div className="space-y-2">
                <Label htmlFor="ceoName">
                  Daglig leder (navn) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ceoName"
                  placeholder="Ola Nordmann"
                  {...form.register("ceoName")}
                />
                {form.formState.errors.ceoName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.ceoName.message}
                  </p>
                )}
              </div>

              {/* E-post */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  E-post <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="post@bedrift.no"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="+47 123 45 678"
                  {...form.register("phone")}
                />
              </div>

              {/* Antall ansatte */}
              <div className="space-y-2">
                <Label htmlFor="employeeRange">
                  Antall ansatte <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["1-5", "6-20", "21-50", "51+"].map((range) => {
                    const isSelected = form.watch("employeeRange") === range;
                    return (
                      <label
                        key={range}
                        className={`relative flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-muted bg-background hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          value={range}
                          {...form.register("employeeRange")}
                          className="sr-only"
                        />
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                          {range}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {form.formState.errors.employeeRange && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.employeeRange.message}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? "Lagrer..." : "Neste: Velg bransje"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Steg 1 av 5 • ~18 minutter igjen
        </div>
      </div>
    </div>
  );
}

