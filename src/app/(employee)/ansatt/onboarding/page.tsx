import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBoardings, fetchMyBoardingTasks } from "@/server/queries/boarding.queries";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoardingProgressBar } from "@/features/boarding/components/boarding-progress-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AnsattOnboardingPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canReadOwnBoarding) {
    redirect("/ansatt");
  }

  const boardings = await fetchBoardings();
  const myTasks = await fetchMyBoardingTasks();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mine onboarding-oppgaver</h1>
        <p className="text-muted-foreground mt-1">
          Oppgaver tildelt deg i pågående onboarding- eller offboarding-prosesser
        </p>
      </div>

      {boardings.length === 0 && myTasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Ingen aktive prosesser for deg akkurat nå.</p>
          </CardContent>
        </Card>
      )}

      {boardings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Mine prosesser</h2>
          {boardings.map((b: any) => {
            const completed = b.tasks.filter((t: any) => t.status === "COMPLETED").length;
            const skipped = b.tasks.filter((t: any) => t.status === "SKIPPED").length;
            return (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {b.type === "ONBOARDING" ? "Onboarding" : "Offboarding"}
                    </CardTitle>
                    <Badge variant="outline">
                      {b.status === "IN_PROGRESS" ? "Pågår" : b.status === "COMPLETED" ? "Fullført" : b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Start: {format(new Date(b.startDate), "d. MMMM yyyy", { locale: nb })}
                  </p>
                  <BoardingProgressBar
                    total={b.tasks.length}
                    completed={completed}
                    skipped={skipped}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {myTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Oppgaver tildelt meg</h2>
          {myTasks.map((task: any) => (
            <Card key={task.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.boarding.employee.name
                      ? `For: ${task.boarding.employee.name}`
                      : ""}
                    {task.dueDate && (
                      <> · Frist: {format(new Date(task.dueDate), "d. MMM", { locale: nb })}</>
                    )}
                  </p>
                </div>
                <Link href={`/dashboard/onboarding/${task.boardingId}`}>
                  <Button variant="outline" size="sm">Åpne</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
