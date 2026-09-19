"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { ServiceRequestDialog } from "@/features/onboarding/components/service-request-dialog";

export function HmsServiceRequestCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            HMS-oppsett som tjeneste
          </CardTitle>
          <CardDescription>
            Få hjelp av HMS Nova med håndbok, rutiner, risikovurdering eller komplett oppsett.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setOpen(true)}>
            Be om hjelp
          </Button>
        </CardContent>
      </Card>
      <ServiceRequestDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
