import Link from "next/link";
import {
  FileText,
  Plus,
  Lock,
  Unlock,
  Send,
  ClipboardList,
  Shield,
  Search,
  GraduationCap,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listGroupContent } from "@/server/actions/corporate-group-content.actions";

const contentTypeLabels: Record<string, { label: string; icon: typeof FileText }> = {
  ROUTINE: { label: "Rutine", icon: ClipboardList },
  DOCUMENT: { label: "Dokument", icon: FileText },
  RISK_ASSESSMENT: { label: "Risikovurdering", icon: Shield },
  INSPECTION_TEMPLATE: { label: "Inspeksjonsmal", icon: Search },
  SJA_TEMPLATE: { label: "SJA-mal", icon: ClipboardList },
  TRAINING_COURSE: { label: "Opplæringskurs", icon: GraduationCap },
  CHEMICAL: { label: "Kjemikalie", icon: FlaskConical },
  HANDBOOK_SECTION: { label: "HMS-håndbok", icon: BookOpen },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Utkast", color: "bg-gray-100 text-gray-600" },
  PUBLISHED: { label: "Publisert", color: "bg-green-50 text-green-700" },
  ARCHIVED: { label: "Arkivert", color: "bg-amber-50 text-amber-700" },
};

export default async function CorporateGroupContentPage() {
  const content = await listGroupContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Innhold</h1>
          <p className="mt-1 text-sm text-gray-500">
            Opprett og administrer HMS-innhold for distribusjon til bedriftene
          </p>
        </div>
        <Link href="/konsern/innhold/ny">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt innhold
          </Button>
        </Link>
      </div>

      {content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen innhold opprettet ennå.</p>
            <Link href="/konsern/innhold/ny" className="mt-4">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Opprett ditt første innhold
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {content.map((item) => {
            const typeInfo = contentTypeLabels[item.contentType] ?? { label: item.contentType, icon: FileText };
            const statusInfo = statusLabels[item.status] ?? statusLabels.DRAFT;
            const TypeIcon = typeInfo.icon;

            return (
              <Link key={item.id} href={`/konsern/innhold/${item.id}`}>
                <Card className="transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <TypeIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-500">{typeInfo.label}</span>
                          {item.category && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-gray-500">{item.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        {item.distributionMode === "LOCKED" ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                        {item.distributionMode === "LOCKED" ? "Låst" : "Tilpassbar"}
                      </div>

                      {item._count.distributions > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Send className="h-3 w-3" />
                          {item._count.distributions}
                        </div>
                      )}

                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
