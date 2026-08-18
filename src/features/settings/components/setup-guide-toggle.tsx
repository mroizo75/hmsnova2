"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Compass } from "lucide-react";
import { toggleSetupGuideVisibility } from "@/server/actions/onboarding.actions";

interface SetupGuideToggleProps {
  tenantId: string;
  currentlyHidden: boolean;
  isAdmin: boolean;
}

export function SetupGuideToggle({
  tenantId,
  currentlyHidden,
  isAdmin,
}: SetupGuideToggleProps) {
  const [hidden, setHidden] = useState(currentlyHidden);
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) return null;

  function handleToggle(showGuide: boolean) {
    startTransition(async () => {
      const result = await toggleSetupGuideVisibility({
        tenantId,
        hidden: !showGuide,
      });
      if (result.success) {
        setHidden(!showGuide);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4" />
          Tilsynsklar-veiviser
        </CardTitle>
        <CardDescription>
          En steg-for-steg guide som hjelper dere bli klare for tilsyn fra Arbeidstilsynet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="setup-guide-toggle" className="cursor-pointer">
            Vis veiviser på dashboardet
          </Label>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              id="setup-guide-toggle"
              checked={!hidden}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
