"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenant } from "@/server/actions/tenant.actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  SUPPORTED_INDUSTRIES,
  getIndustryLabel,
  normalizeIndustryValue,
} from "@/lib/industry-packages";

interface EditTenantFormProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    orgNumber: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    employeeCount: number | null;
    industry: string | null;
    notes: string | null;
  };
}

export function EditTenantForm({ tenant }: EditTenantFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const normalizedIndustry = normalizeIndustryValue(tenant.industry);
  const [selectedIndustry, setSelectedIndustry] = useState(normalizedIndustry || "other");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tenantId: tenant.id,
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      orgNumber: formData.get("orgNumber") as string || undefined,
      address: formData.get("address") as string || undefined,
      postalCode: formData.get("postalCode") as string || undefined,
      city: formData.get("city") as string || undefined,
      contactPerson: formData.get("contactPerson") as string || undefined,
      contactEmail: formData.get("contactEmail") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      employeeCount: formData.get("employeeCount") 
        ? parseInt(formData.get("employeeCount") as string) 
        : undefined,
      industry: selectedIndustry || undefined,
      notes: formData.get("notes") as string || undefined,
    };

    const result = await updateTenant(data);

    if (result.success) {
      toast({
        title: "✅ Bedriftsinformasjon oppdatert",
        description: "Endringene er lagret",
      });
      setIsEditing(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "❌ Feil",
        description: result.error || "Noe gikk galt",
      });
    }

    setIsLoading(false);
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Bedriftsnavn</Label>
            <p className="font-medium mt-1">{tenant.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Slug</Label>
            <p className="font-medium mt-1">{tenant.slug}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Org.nummer</Label>
            <p className="font-medium mt-1">{tenant.orgNumber || "-"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Antall ansatte</Label>
            <p className="font-medium mt-1">{tenant.employeeCount || "-"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Bransje</Label>
            <p className="font-medium mt-1">
              {tenant.industry ? getIndustryLabel(tenant.industry) : "-"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Kontaktperson</Label>
            <p className="font-medium mt-1">{tenant.contactPerson || "-"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">E-post</Label>
            <p className="font-medium mt-1">{tenant.contactEmail || "-"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Telefon</Label>
            <p className="font-medium mt-1">{tenant.contactPhone || "-"}</p>
          </div>
          <div className="md:col-span-2">
            <Label className="text-muted-foreground">Adresse</Label>
            <p className="font-medium mt-1">
              {tenant.address ? (
                <>
                  {tenant.address}
                  {tenant.postalCode && tenant.city && (
                    <>, {tenant.postalCode} {tenant.city}</>
                  )}
                </>
              ) : "-"}
            </p>
          </div>
          {tenant.notes && (
            <div className="md:col-span-2">
              <Label className="text-muted-foreground">Merknader</Label>
              <p className="font-medium mt-1 whitespace-pre-wrap">{tenant.notes}</p>
            </div>
          )}
        </div>
        <Button
          onClick={() => {
            setSelectedIndustry(normalizedIndustry || "other");
            setIsEditing(true);
          }}
          className="w-full"
        >
          Rediger informasjon
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Bedriftsnavn *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={tenant.name}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={tenant.slug}
            required
            pattern="[a-z0-9-]+"
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="orgNumber">Org.nummer</Label>
          <Input
            id="orgNumber"
            name="orgNumber"
            defaultValue={tenant.orgNumber || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="employeeCount">Antall ansatte</Label>
          <Input
            id="employeeCount"
            name="employeeCount"
            type="number"
            min="1"
            defaultValue={tenant.employeeCount || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="industry">Bransje</Label>
          <Select
            value={selectedIndustry}
            onValueChange={setSelectedIndustry}
            disabled={isLoading}
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Velg bransje" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_INDUSTRIES.map((industry) => (
                <SelectItem key={industry.value} value={industry.value}>
                  {industry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="contactPerson">Kontaktperson</Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            defaultValue={tenant.contactPerson || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="contactEmail">E-post</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={tenant.contactEmail || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="contactPhone">Telefon</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={tenant.contactPhone || ""}
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            name="address"
            defaultValue={tenant.address || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Postnummer</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={tenant.postalCode || ""}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="city">Poststed</Label>
          <Input
            id="city"
            name="city"
            defaultValue={tenant.city || ""}
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Merknader</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={tenant.notes || ""}
            rows={3}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lagre endringer
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsEditing(false)}
          disabled={isLoading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}

