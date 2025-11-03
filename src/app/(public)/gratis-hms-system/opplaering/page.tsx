"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiStepProgress } from "@/features/document-generator/components/multi-step-progress";
import { step4Schema, type Step4Data } from "@/features/document-generator/schemas/generator.schema";
import { INDUSTRY_TRAINING } from "@/features/document-generator/data/industry-training";
import { ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OpplaeringGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [industry, setIndustry] = useState<string>("CONSTRUCTION");
  const [completedTraining, setCompletedTraining] = useState<string[]>([]);

  const form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      hasHMSIntroduction: false,
      hasAnnualTraining: false,
      hasNoSystematicTraining: false,
      completedTraining: [],
      firstAidCount: "0",
      lastFirstAidDate: "",
    },
  });

  useEffect(() => {
    const step2Data = localStorage.getItem("hms-generator-step2");
    if (step2Data) {
      const data = JSON.parse(step2Data);
      setIndustry(data.industry);
    }

    // Last inn eksisterende step 4 data hvis den finnes
    const step4Data = localStorage.getItem("hms-generator-step4");
    if (step4Data) {
      try {
        const parsedData = JSON.parse(step4Data);
        Object.keys(parsedData).forEach((key) => {
          if (key === "completedTraining") {
            setCompletedTraining(parsedData[key] || []);
          } else {
            form.setValue(key as keyof Step4Data, parsedData[key]);
          }
        });
      } catch (error) {
        console.error("Failed to load step 4 data:", error);
      }
    }
  }, [form]);

  const trainingCourses = INDUSTRY_TRAINING[industry] || [];

  const onSubmit = async (data: Step4Data) => {
    setIsLoading(true);
    try {
      const finalData = { ...data, completedTraining };
      localStorage.setItem("hms-generator-step4", JSON.stringify(finalData));
      router.push("/gratis-hms-system/bekreft");
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

  const toggleTraining = (courseName: string) => {
    setCompletedTraining((prev) =>
      prev.includes(courseName)
        ? prev.filter((c) => c !== courseName)
        : [...prev, courseName]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <MultiStepProgress currentStep={4} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl">Opplæring og kompetanse</CardTitle>
                <CardDescription>Hvilken opplæring har dere?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Generell HMS-opplæring */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Generell HMS-opplæring</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasHMSIntroduction"
                      {...form.register("hasHMSIntroduction")}
                    />
                    <label htmlFor="hasHMSIntroduction" className="text-sm cursor-pointer">
                      Alle nye ansatte får HMS-introduksjon
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasAnnualTraining"
                      {...form.register("hasAnnualTraining")}
                    />
                    <label htmlFor="hasAnnualTraining" className="text-sm cursor-pointer">
                      Vi har HMS-opplæring minimum 1x/år
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasNoSystematicTraining"
                      {...form.register("hasNoSystematicTraining")}
                    />
                    <label htmlFor="hasNoSystematicTraining" className="text-sm cursor-pointer">
                      Vi har ikke systematisk HMS-opplæring ennå
                    </label>
                  </div>
                </div>
              </div>

              {/* Bransjespesifikk opplæring */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Bransjespesifikk opplæring</Label>
                <p className="text-sm text-muted-foreground">
                  Huk av hva dere HAR (vi legger til resten i opplæringsplanen)
                </p>

                <div className="space-y-2">
                  {trainingCourses.map((course) => (
                    <div key={course.name} className="flex items-start space-x-2">
                      <Checkbox
                        id={course.name}
                        checked={completedTraining.includes(course.name)}
                        onCheckedChange={() => toggleTraining(course.name)}
                      />
                      <label htmlFor={course.name} className="text-sm cursor-pointer flex-1">
                        <span className="font-medium">{course.name}</span>
                        {course.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({course.duration})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mt-3">
                  <p className="text-sm">
                    💡 Mangler noe? HMS Nova lager automatisk opplæringsplan for alt du ikke har!
                  </p>
                </div>
              </div>

              {/* Førstehjelpskurs */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Førstehjelpskurs</Label>
                <p className="text-sm text-muted-foreground">
                  Lovkrav: Minimum 2 personer per arbeidsplass
                </p>

                <div className="grid grid-cols-5 gap-2">
                  {["0", "1", "2", "3-5", "6+"].map((count) => {
                    const isSelected = form.watch("firstAidCount") === count;
                    return (
                      <label
                        key={count}
                        className={`relative flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-muted bg-background hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          value={count}
                          {...form.register("firstAidCount")}
                          className="sr-only"
                        />
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/gratis-hms-system/roller")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Tilbake
                </Button>
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? "Lagrer..." : "Neste: Bekreft"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Steg 4 av 5 • ~5 minutter igjen
        </div>
      </div>
    </div>
  );
}

