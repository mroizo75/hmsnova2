"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getGroupContentById,
  updateGroupContent,
} from "@/server/actions/corporate-group-content.actions";
import type { CorporateGroupDistMode } from "@prisma/client";

export default function EditCorporateGroupContentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const contentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [legalReference, setLegalReference] = useState("");
  const [distributionMode, setDistributionMode] = useState<CorporateGroupDistMode>("CUSTOMIZABLE");
  const [contentHtml, setContentHtml] = useState("");
  const [contentType, setContentType] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getGroupContentById(contentId);
        setTitle(data.title);
        setDescription(data.description ?? "");
        setCategory(data.category ?? "");
        setLegalReference(data.legalReference ?? "");
        setDistributionMode(data.distributionMode);
        setContentType(data.contentType);
        if (data.content && typeof data.content === "object") {
          const c = data.content as Record<string, unknown>;
          setContentHtml((c.html as string) ?? "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contentId]);

  function handleSave() {
    startSaving(async () => {
      try {
        const contentData: Record<string, unknown> = {};
        if (contentHtml) {
          contentData.html = contentHtml;
        }

        await updateGroupContent(contentId, {
          title,
          description: description || undefined,
          category: category || undefined,
          legalReference: legalReference || undefined,
          distributionMode,
          content: Object.keys(contentData).length > 0 ? contentData : undefined,
        });
        toast({ title: "Lagret", description: "Innholdet er oppdatert" });
        router.push(`/konsern/innhold/${contentId}`);
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const contentTypeLabels: Record<string, string> = {
    ROUTINE: "Rutine",
    DOCUMENT: "Dokument",
    RISK_ASSESSMENT: "Risikovurdering",
    INSPECTION_TEMPLATE: "Inspeksjonsmal",
    SJA_TEMPLATE: "SJA-mal",
    TRAINING_COURSE: "Opplæringskurs",
    CHEMICAL: "Kjemikalie",
    HANDBOOK_SECTION: "HMS-håndbok",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/konsern/innhold/${contentId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger innhold</h1>
        <span className="text-sm text-gray-500">
          {contentTypeLabels[contentType] ?? contentType}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="F.eks. Brannvern" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalReference">Lovhjemmel</Label>
            <Input
              id="legalReference"
              value={legalReference}
              onChange={(e) => setLegalReference(e.target.value)}
              placeholder="F.eks. IK-HMS § 5, AML § 3-1"
            />
          </div>

          <div className="space-y-2">
            <Label>Distribusjonsmodus</Label>
            <select
              value={distributionMode}
              onChange={(e) => setDistributionMode(e.target.value as CorporateGroupDistMode)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CUSTOMIZABLE">Tilpassbar – bedriften kan redigere lokalt</option>
              <option value="LOCKED">Låst – styrt fra konsernet, read-only for bedriften</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Innhold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="contentHtml">
              Innholdstekst (HTML)
            </Label>
            <textarea
              id="contentHtml"
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Skriv innholdet her. Støtter HTML for formatering."
            />
            <p className="text-xs text-gray-400">
              For rutiner og dokumenter — dette er selve innholdet som distribueres til bedriftene.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={`/konsern/innhold/${contentId}`}>
          <Button variant="outline">Avbryt</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lagre endringer
        </Button>
      </div>
    </div>
  );
}
