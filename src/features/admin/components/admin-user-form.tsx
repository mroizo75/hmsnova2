"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createAdminUser, updateAdminUser } from "@/server/actions/admin.actions";
import { Role } from "@prisma/client";

const adminUserSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  password: z.string().min(8, "Passord må være minst 8 tegn").optional(),
  isSuperAdmin: z.boolean(),
  tenantId: z.string().optional(),
  role: z.enum(["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"]).optional(),
});

type AdminUserFormValues = z.infer<typeof adminUserSchema>;

interface AdminUserFormProps {
  tenants: Array<{ id: string; name: string; status: string }>;
  user?: {
    id: string;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
    tenants: Array<{
      tenantId: string;
      role: Role;
    }>;
  };
}

export function AdminUserForm({ tenants, user }: AdminUserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdminUserFormValues>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.name || "",
      isSuperAdmin: user?.isSuperAdmin || false,
      tenantId: user?.tenants[0]?.tenantId || undefined,
      role: user?.tenants[0]?.role || undefined,
    },
  });

  const isSuperAdmin = watch("isSuperAdmin");

  const onSubmit = async (data: AdminUserFormValues) => {
    setLoading(true);

    try {
      const result = user
        ? await updateAdminUser(user.id, data as any)
        : await createAdminUser(data as any);

      if (result.success) {
        toast({
          title: user ? "✅ Bruker oppdatert" : "✅ Bruker opprettet",
          description: user
            ? "Brukerens informasjon er oppdatert"
            : "Den nye brukeren er lagt til i systemet",
          className: "bg-green-50 border-green-200",
        });
        router.push("/admin/users");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre bruker",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">E-post *</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled={loading || !!user}
          placeholder="bruker@eksempel.no"
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Navn *</Label>
        <Input
          id="name"
          {...register("name")}
          disabled={loading}
          placeholder="Ola Nordmann"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {!user && (
        <div className="space-y-2">
          <Label htmlFor="password">Passord *</Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={loading}
            placeholder="Minst 8 tegn"
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isSuperAdmin"
          checked={isSuperAdmin}
          onCheckedChange={(checked) =>
            setValue("isSuperAdmin", checked as boolean)
          }
          disabled={loading}
        />
        <Label htmlFor="isSuperAdmin" className="font-normal cursor-pointer">
          Superadmin (full systemtilgang)
        </Label>
      </div>

      {!isSuperAdmin && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tenantId">Bedrift</Label>
            <Select
              onValueChange={(value) => setValue("tenantId", value)}
              defaultValue={user?.tenants[0]?.tenantId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg bedrift..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Ingen bedrift</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rolle</Label>
            <Select
              onValueChange={(value) => setValue("role", value as Role)}
              defaultValue={user?.tenants[0]?.role}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg rolle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="HMS">HMS-ansvarlig</SelectItem>
                <SelectItem value="LEDER">Leder</SelectItem>
                <SelectItem value="VERNEOMBUD">Verneombud</SelectItem>
                <SelectItem value="ANSATT">Ansatt</SelectItem>
                <SelectItem value="BHT">Bedriftshelsetjeneste</SelectItem>
                <SelectItem value="REVISOR">Revisor</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : user ? "Oppdater bruker" : "Opprett bruker"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/users")}
          disabled={loading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}

