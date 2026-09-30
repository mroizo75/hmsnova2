import { redirect } from "next/navigation";
import { BookTemplate } from "lucide-react";
import { SjaTemplateEditor } from "@/components/sja/sja-template-editor";
import { getAuthContext } from "@/lib/server-authorization";

export default async function NewSjaTemplatePage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canApproveSja) redirect("/dashboard/sja");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookTemplate className="h-7 w-7 text-amber-600" />
          Ny SJA-mal
        </h1>
        <p className="text-muted-foreground">
          Standardiser arbeidsmetode, kompetansekrav, farer og tiltak for bedriften.
        </p>
      </div>
      <SjaTemplateEditor />
    </div>
  );
}
