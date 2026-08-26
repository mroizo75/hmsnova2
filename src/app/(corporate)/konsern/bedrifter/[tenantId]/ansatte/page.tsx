import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantEmployees } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    HMS: "HMS-ansvarlig",
    LEDER: "Leder",
    VERNEOMBUD: "Verneombud",
    ANSATT: "Ansatt",
    BHT: "BHT",
    REVISOR: "Revisor",
  };
  return labels[role] ?? role;
}

function roleColor(role: string): string {
  if (role === "ADMIN") return "bg-purple-50 text-purple-700";
  if (role === "HMS") return "bg-blue-50 text-blue-700";
  if (role === "LEDER") return "bg-indigo-50 text-indigo-700";
  if (role === "VERNEOMBUD") return "bg-teal-50 text-teal-700";
  return "bg-gray-100 text-gray-600";
}

export default async function TenantEmployeesPage({ params }: PageProps) {
  const { tenantId } = await params;
  const employees = await getGroupTenantEmployees(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ansatte</h2>
          <p className="text-xs text-gray-400">
            GDPR: Kun navn, stilling, avdeling og rolle vises til konsern-nivå
          </p>
        </div>
        <span className="text-sm text-gray-500">{employees.length} registrert</span>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen ansatte registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Navn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Stilling
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Avdeling
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rolle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {emp.user.name ?? "Ikke satt"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {emp.position ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {emp.department ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColor(emp.role)}`}>
                      {roleLabel(emp.role)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
