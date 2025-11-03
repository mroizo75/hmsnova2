import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChemicalForm } from "@/features/chemicals/components/chemical-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewChemicalPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/chemicals">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til stoffkartotek
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Registrer nytt kjemikalie</h1>
        <p className="text-muted-foreground">
          Legg til produkt i stoffkartoteket med sikkerhetsdatablad
        </p>
      </div>

      <ChemicalForm mode="create" />
    </div>
  );
}

