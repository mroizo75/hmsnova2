import { getGroupSettings } from "@/server/actions/corporate-group-settings.actions";
import { KonsernSettingsForm } from "./settings-form";

export default async function KonsernSettingsPage() {
  const settings = await getGroupSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administrer konsernets informasjon, logo og varslingsinnstillinger
        </p>
      </div>

      <KonsernSettingsForm
        initialData={{
          name: settings.name,
          orgNumber: settings.orgNumber ?? "",
          contactEmail: settings.contactEmail ?? "",
          contactPhone: settings.contactPhone ?? "",
          logoUrl: settings.logo,
          notifications: settings.notifications,
        }}
      />
    </div>
  );
}
