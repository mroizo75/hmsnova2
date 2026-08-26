"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCorporateGroup } from "@/server/actions/admin-corporate-group.actions";

export default function AdminCreateCorporateGroupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const name = formData.get("name") as string;
      const slug = formData.get("slug") as string;
      const orgNumber = formData.get("orgNumber") as string;
      const contactEmail = formData.get("contactEmail") as string;
      const contactPhone = formData.get("contactPhone") as string;

      if (!name || !slug) {
        setError("Navn og slug er obligatorisk");
        setIsSubmitting(false);
        return;
      }

      await createCorporateGroup({
        name,
        slug,
        orgNumber: orgNumber || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      });

      router.push("/admin/konsern");
    } catch (err) {
      setError(err instanceof Error ? err.message : "En feil oppstod");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/konsern">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nytt konsern</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Navn *</label>
              <input
                name="name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="F.eks. Nordfjord Hotellkjede AS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Slug *</label>
              <input
                name="slug"
                type="text"
                required
                pattern="[a-z0-9-]+"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="f.eks. nordfjord-hotellkjede"
              />
              <p className="mt-1 text-xs text-gray-500">Kun små bokstaver, tall og bindestrek.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Org.nr</label>
              <input
                name="orgNumber"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="F.eks. 912345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kontakt e-post</label>
              <input
                name="contactEmail"
                type="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kontakt telefon</label>
              <input
                name="contactPhone"
                type="tel"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/admin/konsern">
                <Button type="button" variant="outline">Avbryt</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Oppretter..." : "Opprett konsern"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
