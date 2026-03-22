import { NotificationsPageContent } from "@/components/notifications/notifications-page-content";
import { getTranslations } from "next-intl/server";

export default async function EmployeeNotificationsPage() {
  const t = await getTranslations("employeeNotificationsPage");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <NotificationsPageContent />
    </div>
  );
}
