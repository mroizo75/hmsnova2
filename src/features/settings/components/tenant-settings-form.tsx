"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTenantSettings } from "@/server/actions/settings.actions";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import type { Tenant } from "@prisma/client";

interface TenantSettingsFormProps {
  tenant: Tenant;
  isAdmin: boolean;
}

export function TenantSettingsForm({ tenant, isAdmin }: TenantSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Ingen tilgang",
        description: "Kun administratorer kan endre bedriftsinnstillinger",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      orgNumber: formData.get("orgNumber") as string || undefined,
      contactEmail: formData.get("contactEmail") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      address: formData.get("address") as string || undefined,
      city: formData.get("city") as string || undefined,
      postalCode: formData.get("postalCode") as string || undefined,
    };

    const result = await updateTenantSettings(data);

    if (result.success) {
      toast({
        title: "✅ Innstillinger lagret",
        description: "Bedriftsinformasjonen er oppdatert",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke lagre innstillinger",
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bedriftsinformasjon
          </CardTitle>
          <CardDescription>
            Grunnleggende informasjon om bedriften
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bedriftsnavn *</Label>
            <Input
              id="name"
              name="name"
              required
              disabled={loading || !isAdmin}
              defaultValue={tenant.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
            <Input
              id="orgNumber"
              name="orgNumber"
              placeholder="123 456 789"
              disabled={loading || !isAdmin}
              defaultValue={tenant.orgNumber || ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Kontakt e-post</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="post@bedrift.no"
                disabled={loading || !isAdmin}
                defaultValue={tenant.contactEmail || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Kontakt telefon</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="12 34 56 78"
                disabled={loading || !isAdmin}
                defaultValue={tenant.contactPhone || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              name="address"
              placeholder="Gateveien 1"
              disabled={loading || !isAdmin}
              defaultValue={tenant.address || ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postnummer</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="0123"
                disabled={loading || !isAdmin}
                defaultValue={tenant.postalCode || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Poststed</Label>
              <Input
                id="city"
                name="city"
                placeholder="Oslo"
                disabled={loading || !isAdmin}
                defaultValue={tenant.city || ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Lagrer..." : "Lagre endringer"}
          </Button>
        </div>
      )}

      {!isAdmin && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              ℹ️ Kun administratorer kan endre bedriftsinnstillinger
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  );
}

