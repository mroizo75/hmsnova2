import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assignRoutineResponsible,
  getRoutineById,
  scheduleRoutineFollowUp,
  updateRoutine,
} from "@/server/actions/routine.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getRoutineById(id);
  if (!result.success) {
    redirect("/dashboard/rutiner");
  }
  const routine = result.data;

  const users = await prisma.userTenant.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ role: "asc" }],
  });

  async function onSave(formData: FormData) {
    "use server";

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const legalReference = String(formData.get("legalReference") || "").trim();
    const reviewIntervalRaw = String(formData.get("reviewIntervalMonths") || "").trim();
    const nextReviewAtRaw = String(formData.get("nextReviewAt") || "").trim();
    const contentRaw = String(formData.get("content") || "").trim();
    const responsibleId = String(formData.get("responsibleId") || "").trim();

    let content: unknown = {};
    if (contentRaw) {
      try {
        content = JSON.parse(contentRaw);
      } catch {
        content = { text: contentRaw };
      }
    }

    const reviewIntervalMonths = reviewIntervalRaw ? Number(reviewIntervalRaw) : undefined;
    const nextReviewAt = nextReviewAtRaw ? new Date(nextReviewAtRaw) : null;

    const updateResult = await updateRoutine({
      id,
      title,
      description: description || null,
      category: category || null,
      legalReference: legalReference || null,
      content,
      reviewIntervalMonths: reviewIntervalMonths && reviewIntervalMonths > 0 ? reviewIntervalMonths : undefined,
      nextReviewAt,
    });

    if (updateResult.success && responsibleId) {
      await assignRoutineResponsible(id, responsibleId);
    }

    if (updateResult.success && nextReviewAt) {
      await scheduleRoutineFollowUp(id, nextReviewAt, reviewIntervalMonths);
    }

    revalidatePath(`/dashboard/rutiner/${id}`);
    revalidatePath("/dashboard/rutiner");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/rutiner/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Rediger rutine</h1>
          <p className="text-muted-foreground mt-1">Endringer lagres pa din virksomhets egen rutine.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rutineinnstillinger</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel</Label>
              <Input id="title" name="title" defaultValue={routine.title} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea id="description" name="description" defaultValue={routine.description || ""} rows={4} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" name="category" defaultValue={routine.category || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalReference">Lovreferanse</Label>
                <Input
                  id="legalReference"
                  name="legalReference"
                  defaultValue={routine.legalReference || ""}
                  placeholder="Eks. IK-HMS § 5, AML § 3-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsibleId">Ansvarlig</Label>
                <select
                  id="responsibleId"
                  name="responsibleId"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue={routine.responsibleId || ""}
                >
                  <option value="">Velg ansvarlig</option>
                  {users.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name || member.user.email} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewIntervalMonths">Revisjonsintervall (mnd)</Label>
                <Input
                  id="reviewIntervalMonths"
                  name="reviewIntervalMonths"
                  type="number"
                  min={1}
                  defaultValue={routine.reviewIntervalMonths}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextReviewAt">Neste revisjon</Label>
                <Input
                  id="nextReviewAt"
                  name="nextReviewAt"
                  type="date"
                  defaultValue={
                    routine.nextReviewAt ? new Date(routine.nextReviewAt).toISOString().slice(0, 10) : ""
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Innhold (JSON)</Label>
              <Textarea
                id="content"
                name="content"
                rows={12}
                defaultValue={JSON.stringify(routine.content || {}, null, 2)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">Lagre endringer</Button>
              <Link href={`/dashboard/rutiner/${id}`}>
                <Button type="button" variant="outline">
                  Avbryt
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
