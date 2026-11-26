import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMeasureStatusColor, getMeasureStatusLabel } from "@/features/measures/schemas/measure.schema";

export default async function EmployeeMeasuresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) redirect("/login");

  const measures = await prisma.measure.findMany({
    where: {
      tenantId: session.user.tenantId,
      responsibleId: session.user.id,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
    },
  });

  const open = measures.filter((measure) => measure.status !== "DONE");
  const done = measures.filter((measure) => measure.status === "DONE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mine tiltak</h1>
        <p className="text-sm text-muted-foreground">Tiltak som er tildelt deg.</p>
      </div>
      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-muted-foreground">Du har ingen tiltak.</p>
      ) : (
        <div className="space-y-3">
          {[...open, ...done].map((measure) => (
            <Link key={measure.id} href={`/ansatt/tiltak/${measure.id}`}>
              <Card className="hover:border-primary">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{measure.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Frist {new Date(measure.dueAt).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <Badge className={getMeasureStatusColor(measure.status)}>
                    {getMeasureStatusLabel(measure.status)}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
