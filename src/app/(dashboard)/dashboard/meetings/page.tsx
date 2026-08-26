import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchMeetings } from "@/server/queries/meeting.queries";
import { MeetingsContent } from "@/features/meetings/components/meetings-content";

export default async function MeetingsPage() {
  const t = await getTranslations("dashboardMeetingsPage");
  const locale = await getLocale();
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadMeetings) {
    redirect("/dashboard");
  }

  const initialData = await fetchMeetings();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.meetings} />
        </div>
        {permissions.canCreateMeetings && (
          <Link href="/dashboard/meetings/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("actions.newMeeting")}
            </Button>
          </Link>
        )}
      </div>

      <MeetingsContent
        initialData={initialData}
        locale={locale}
        canCreateMeetings={permissions.canCreateMeetings}
      />
    </div>
  );
}
