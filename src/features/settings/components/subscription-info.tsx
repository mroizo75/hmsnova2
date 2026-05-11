"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar } from "lucide-react";
import type { Tenant, Subscription } from "@prisma/client";
import { BINDING_PRICES } from "@/lib/subscription";

interface SubscriptionInfoProps {
  tenant: Tenant & {
    subscription: Subscription | null;
  };
}

export function SubscriptionInfo({ tenant }: SubscriptionInfoProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aktiv</Badge>;
      case "TRIAL":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Prøveperiode</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Kansellert</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Suspendert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Abonnement
        </CardTitle>
        <CardDescription>
          Din nåværende abonnementsplan
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tenant.subscription ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">HMS Nova Software</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getStatusBadge(tenant.subscription.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Pris</p>
                <p className="text-lg font-semibold">
                  {BINDING_PRICES["1year"].monthlyPrice} kr/mnd
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Periode starter
                </p>
                <p className="font-medium">
                  {new Date(tenant.subscription.currentPeriodStart).toLocaleDateString("nb-NO")}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Periode slutter
                </p>
                <p className="font-medium">
                  {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString("nb-NO")}
                </p>
              </div>
            </div>

            {tenant.status === "TRIAL" && tenant.trialEndsAt && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900">
                    Prøveperiode utløper{" "}
                    {new Date(tenant.trialEndsAt).toLocaleDateString("nb-NO")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Ingen abonnement funnet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
