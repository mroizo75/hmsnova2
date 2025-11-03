"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: number;
  name: string;
  description: string;
};

const STEPS: Step[] = [
  { id: 1, name: "Bedrift", description: "Bedriftsinformasjon" },
  { id: 2, name: "Bransje", description: "Velg bransje" },
  { id: 3, name: "HMS-roller", description: "Organisering" },
  { id: 4, name: "Opplæring", description: "Kompetanse" },
  { id: 5, name: "Bekreft", description: "Generer" },
];

type MultiStepProgressProps = {
  currentStep: number;
};

export function MultiStepProgress({ currentStep }: MultiStepProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, stepIdx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex items-center",
                stepIdx !== STEPS.length - 1 && "flex-1"
              )}
            >
              {/* Connector line */}
              {stepIdx !== STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-5 h-0.5",
                    isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-col items-center group">
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming && "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>

                {/* Text */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      (isCompleted || isCurrent) && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

