import { NotificationsPageContent } from "@/components/notifications/notifications-page-content";

export default function DashboardNotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Alle varslinger</h1>
      <NotificationsPageContent />
    </div>
  );
}
