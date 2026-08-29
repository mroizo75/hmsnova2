import { listGroupMessages } from "@/server/actions/corporate-group-messages.actions";
import { listGroupTenants } from "@/server/actions/corporate-group.actions";
import { MessageList } from "./message-list";
import { CreateMessageForm } from "./create-message-form";

export default async function KonsernMessagesPage() {
  const [messages, tenants] = await Promise.all([
    listGroupMessages(),
    listGroupTenants(),
  ]);

  const tenantOptions = tenants.map((t) => ({
    id: t.tenant.id,
    name: t.tenant.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meldinger</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send meldinger til bedriftene i konsernet med lesebekreftelse.
        </p>
      </div>

      <CreateMessageForm tenants={tenantOptions} />
      <MessageList messages={messages} />
    </div>
  );
}
