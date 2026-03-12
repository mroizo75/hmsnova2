"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Car, HeartPulse, MapPin } from "lucide-react";
import { TimeEntryForm } from "./time-entry-form";
import { MileageEntryForm } from "./mileage-entry-form";

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface RegistrationFormUnifiedProps {
  tenantId: string;
  projects: Project[];
  initialProjectId?: string;
  lunchBreakMinutes?: number;
  eveningOvertimeFromHour?: number | null;
  defaultKmRate: number;
  rateEditable?: boolean;
  showDisclaimer?: boolean;
}

export function RegistrationFormUnified({
  tenantId,
  projects,
  initialProjectId,
  lunchBreakMinutes = 30,
  eveningOvertimeFromHour,
  defaultKmRate,
  rateEditable = true,
  showDisclaimer = false,
}: RegistrationFormUnifiedProps) {
  return (
    <Tabs defaultValue="work" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-4 mb-4">
        <TabsTrigger value="work" className="gap-1.5">
          <Briefcase className="h-4 w-4" />
          Arbeid
        </TabsTrigger>
        <TabsTrigger value="travel" className="gap-1.5">
          <Car className="h-4 w-4" />
          Reise
        </TabsTrigger>
        <TabsTrigger value="sick" className="gap-1.5">
          <HeartPulse className="h-4 w-4" />
          Sykefravær
        </TabsTrigger>
        <TabsTrigger value="km" className="gap-1.5">
          <MapPin className="h-4 w-4" />
          Km godtgjørelse
        </TabsTrigger>
      </TabsList>
      <div className="min-h-[120px]">
        <TabsContent value="work">
          <TimeEntryForm
            tenantId={tenantId}
            projects={projects}
            initialProjectId={initialProjectId}
            lunchBreakMinutes={lunchBreakMinutes}
            eveningOvertimeFromHour={eveningOvertimeFromHour}
            forceMode="work"
          />
        </TabsContent>
        <TabsContent value="travel">
          <TimeEntryForm
            tenantId={tenantId}
            projects={projects}
            initialProjectId={initialProjectId}
            lunchBreakMinutes={lunchBreakMinutes}
            eveningOvertimeFromHour={eveningOvertimeFromHour}
            forceMode="travel"
          />
        </TabsContent>
        <TabsContent value="sick">
          <TimeEntryForm
            tenantId={tenantId}
            projects={projects}
            initialProjectId={initialProjectId}
            lunchBreakMinutes={lunchBreakMinutes}
            eveningOvertimeFromHour={eveningOvertimeFromHour}
            forceMode="sick"
          />
        </TabsContent>
        <TabsContent value="km">
          <MileageEntryForm
            tenantId={tenantId}
            projects={projects}
            initialProjectId={initialProjectId}
            defaultKmRate={defaultKmRate}
            rateEditable={rateEditable}
            showDisclaimer={showDisclaimer}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
