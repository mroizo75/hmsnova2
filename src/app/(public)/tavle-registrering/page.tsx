import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { TavleRegistreringClient } from "@/features/hms-tavle/components/tavle-registrering-client";

export const metadata: Metadata = {
  title: "Bestill Digital HMS Tavle – HMS Nova",
  description:
    "Kom i gang med Digital HMS Tavle for byggeplassen din. Ingen HMS Nova-abonnement nødvendig. Velg plan og prosjektvarighet.",
};

interface Props {
  searchParams: Promise<{ plan?: string }>;
}

const GYLDIGE_PLANER = ["ENKEL", "STANDARD", "AVANSERT"] as const;

export default async function TavleRegistreringPage({ searchParams }: Props) {
  const { plan } = await searchParams;
  const initialPlan = GYLDIGE_PLANER.find(
    (gyldig) => gyldig === plan?.toUpperCase()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumbs */}
        <nav aria-label="Navigasjonssti" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                <Home className="h-3.5 w-3.5" />
                Hjem
              </Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5 text-gray-400" /></li>
            <li>
              <Link href="/digital-hms-tavle" className="hover:text-gray-800 transition-colors">
                Digital HMS Tavle
              </Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5 text-gray-400" /></li>
            <li className="text-gray-900 font-medium">Bestill</li>
          </ol>
        </nav>

        {/* Tittel */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Digital HMS Tavle</h1>
          <p className="text-gray-600 mt-2">
            Fullt lovkravskompatibel digital tavle for bygg og anlegg.
            <br />
            Ingen HMS Nova-abonnement nødvendig.
          </p>
        </div>

        <TavleRegistreringClient initialPlan={initialPlan} />
      </div>
    </div>
  );
}
