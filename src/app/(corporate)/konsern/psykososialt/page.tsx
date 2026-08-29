import { HeartPulse, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupWellbeingOverview } from "@/server/actions/corporate-group-stats.actions";

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 4.0) return { text: "Svært godt", color: "text-emerald-600" };
  if (score >= 3.5) return { text: "Godt", color: "text-emerald-500" };
  if (score >= 3.0) return { text: "Akseptabelt", color: "text-amber-600" };
  if (score >= 2.0) return { text: "Bekymringsfullt", color: "text-orange-600" };
  return { text: "Kritisk", color: "text-red-600" };
}

function barWidth(score: number): string {
  return `${Math.round((score / 5) * 100)}%`;
}

function barColor(score: number): string {
  if (score >= 4.0) return "bg-emerald-500";
  if (score >= 3.0) return "bg-amber-500";
  return "bg-red-500";
}

export default async function KonsernPsykososialtPage() {
  const data = await getGroupWellbeingOverview();

  const withScores = data.filter((t) => t.averageScore !== null);
  const withoutScores = data.filter((t) => t.averageScore === null && t.totalResponses > 0);
  const noSurveys = data.filter((t) => t.totalResponses === 0);

  const overallAvg = withScores.length > 0
    ? parseFloat(
        (withScores.reduce((s, t) => s + (t.averageScore ?? 0), 0) / withScores.length).toFixed(1)
      )
    : null;

  const lowScoreTenants = withScores.filter((t) => (t.averageScore ?? 5) < 3.0);
  const criticalTenants = withScores.filter((t) => t.criticalCount > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Psykososialt arbeidsmiljø</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aggregert oversikt over bedriftenes psykososiale kartlegging (AML § 4-3, ISO 45003)
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          <strong>GDPR:</strong> Kun aggregerte data vises. Bedrifter med færre enn 5 besvarelser
          skjules for å forhindre re-identifisering av enkeltpersoner (GDPR Art. 9 — helseopplysninger).
        </p>
      </div>

      {/* KPI-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <HeartPulse className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Samlet score</p>
                {overallAvg ? (
                  <p className={`text-2xl font-bold ${scoreLabel(overallAvg).color}`}>
                    {overallAvg}/5
                  </p>
                ) : (
                  <p className="text-lg font-medium text-gray-400">Ingen data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <HeartPulse className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Bedrifter med data</p>
                <p className="text-2xl font-bold text-gray-900">
                  {withScores.length} <span className="text-sm font-normal text-gray-400">av {data.length}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${lowScoreTenants.length > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                <AlertTriangle className={`h-5 w-5 ${lowScoreTenants.length > 0 ? "text-red-600" : "text-emerald-600"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lav score (&lt;3.0)</p>
                <p className={`text-2xl font-bold ${lowScoreTenants.length > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {lowScoreTenants.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${criticalTenants.length > 0 ? "bg-orange-50" : "bg-emerald-50"}`}>
                <ShieldAlert className={`h-5 w-5 ${criticalTenants.length > 0 ? "text-orange-600" : "text-emerald-600"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Kritiske forhold</p>
                <p className={`text-2xl font-bold ${criticalTenants.length > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                  {criticalTenants.reduce((s, t) => s + t.criticalCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bedrifter med tilstrekkelige data */}
      {withScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bedriftsoversikt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Bedrift
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden sm:table-cell">
                      Besvarelser
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden md:table-cell">
                      Kritiske
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                      Siste kartlegging
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {withScores
                    .sort((a, b) => (a.averageScore ?? 5) - (b.averageScore ?? 5))
                    .map((t) => {
                      const sc = scoreLabel(t.averageScore!);
                      return (
                        <tr key={t.tenantId}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                            {t.tenantName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColor(t.averageScore!)}`}
                                  style={{ width: barWidth(t.averageScore!) }}
                                />
                              </div>
                              <span className={`text-sm font-semibold ${sc.color}`}>
                                {t.averageScore}
                              </span>
                              <span className={`text-[10px] ${sc.color}`}>{sc.text}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                            {t.totalResponses}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 hidden md:table-cell">
                            {t.criticalCount > 0 ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                {t.criticalCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                            {t.lastSurveyDate
                              ? t.lastSurveyDate.toLocaleDateString("nb-NO")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seksjonsdetaljer for bedrifter med data */}
      {withScores.filter((t) => t.sectionScores.length > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seksjonsvurderinger per bedrift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {withScores
              .filter((t) => t.sectionScores.length > 0)
              .sort((a, b) => (a.averageScore ?? 5) - (b.averageScore ?? 5))
              .map((t) => (
                <div key={t.tenantId} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-gray-900 mb-2">{t.tenantName}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {t.sectionScores.map((s) => (
                      <div key={s.section} className="flex items-center gap-2">
                        <span className="w-40 text-xs text-gray-500 truncate">{s.section}</span>
                        <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor(s.average)}`}
                            style={{ width: barWidth(s.average) }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-6 text-right ${scoreLabel(s.average).color}`}>
                          {s.average}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Varsler */}
      {(noSurveys.length > 0 || withoutScores.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" />
              Oppfølging nødvendig
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {noSurveys.map((t) => (
              <div
                key={t.tenantId}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <span className="text-sm text-amber-800">{t.tenantName}</span>
                <span className="text-xs text-amber-600">Ingen kartlegging gjennomført</span>
              </div>
            ))}
            {withoutScores.map((t) => (
              <div
                key={t.tenantId}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
              >
                <span className="text-sm text-gray-700">{t.tenantName}</span>
                <span className="text-xs text-gray-500">
                  {t.totalResponses} besvarelser (min. 5 for visning)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HeartPulse className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen bedrifter i konsernet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
