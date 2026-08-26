import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, BarChart3 } from "lucide-react";
import { WellbeingReport } from "@/components/wellbeing/wellbeing-report";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchWellbeingData } from "@/server/queries/wellbeing.queries";
import { WellbeingContent } from "@/features/wellbeing/components/wellbeing-content";

export default async function WellbeingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const userRole = session.user.role;
  const initialData = await fetchWellbeingData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Psykososialt arbeidsmiljø</h1>
          <p className="text-muted-foreground mt-1">
            Kartlegging og oppfølging av psykososialt arbeidsmiljø i henhold til Arbeidsmiljøloven § 4-3
          </p>
        </div>
        <PageHelpDialog content={helpContent.wellbeing} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Heart className="h-4 w-4 mr-2" />
            Oversikt
          </TabsTrigger>
          <TabsTrigger value="report">
            <BarChart3 className="h-4 w-4 mr-2" />
            Årsrapport
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <WellbeingContent initialData={initialData} userRole={userRole} />
        </TabsContent>

        <TabsContent value="report">
          <WellbeingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
