"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createGroupContent } from "@/server/actions/corporate-group-content.actions";
import type { CorporateGroupContentType, CorporateGroupDistMode } from "@prisma/client";

const contentTypes: { value: CorporateGroupContentType; label: string; description: string }[] = [
  { value: "ROUTINE", label: "Rutine", description: "Strukturert HMS-rutine (IK-HMS § 5)" },
  { value: "DOCUMENT", label: "Dokument", description: "HMS-dokument med versjonering" },
  { value: "RISK_ASSESSMENT", label: "Risikovurdering", description: "Årlig risikovurdering (AML § 3-1)" },
  { value: "INSPECTION_TEMPLATE", label: "Inspeksjonsmal", description: "Mal for vernerunde/inspeksjon" },
  { value: "SJA_TEMPLATE", label: "SJA-mal", description: "Sikker Jobb Analyse mal" },
  { value: "TRAINING_COURSE", label: "Opplæringskurs", description: "Kursmal for opplæring" },
  { value: "CHEMICAL", label: "Kjemikalie", description: "Stoffkartotek-oppføring" },
  { value: "HANDBOOK_SECTION", label: "HMS-håndbok", description: "Seksjon i HMS-håndboken" },
];

export default function CreateCorporateGroupContentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const contentType = formData.get("contentType") as CorporateGroupContentType;
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const distributionMode = formData.get("distributionMode") as CorporateGroupDistMode;
      const legalReference = formData.get("legalReference") as string;
      const category = formData.get("category") as string;

      if (!contentType || !title) {
        setError("Type og tittel er obligatorisk");
        setIsSubmitting(false);
        return;
      }

      const created = await createGroupContent({
        contentType,
        title,
        description: description || undefined,
        distributionMode: distributionMode || "CUSTOMIZABLE",
        legalReference: legalReference || undefined,
        category: category || undefined,
      });

      router.push(`/konsern/innhold/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "En feil oppstod");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/konsern/innhold">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nytt innhold</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Type *</label>
              <select
                name="contentType"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Velg type...</option>
                {contentTypes.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label} – {ct.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tittel *</label>
              <input
                name="title"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="F.eks. Brannvernrutine for hoteller"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Beskrivelse</label>
              <textarea
                name="description"
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Beskriv innholdet..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kategori</label>
              <input
                name="category"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="F.eks. Brannvern, HMS, Internkontroll"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lovhjemmel</label>
              <input
                name="legalReference"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="F.eks. IK-HMS § 5, AML § 3-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Distribusjonsmodus</label>
              <select
                name="distributionMode"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="CUSTOMIZABLE">Tilpassbar – bedriften kan redigere lokalt</option>
                <option value="LOCKED">Låst – styrt fra konsernet, read-only for bedriften</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Låst innhold oppdateres automatisk i alle bedrifter når du gjør endringer.
                Tilpassbart innhold kopieres til bedriften som kan tilpasse det selv.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/konsern/innhold">
                <Button type="button" variant="outline">Avbryt</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Oppretter..." : "Opprett innhold"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
