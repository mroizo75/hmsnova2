import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ExposureRegisterFormClient } from "../../exposure-register-form-client";

export default async function EditExposureRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) return <div>Ingen tenant.</div>;

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) return <div>Ingen tenant.</div>;

  const tenantId = selectedMembership.tenantId;

  const [entry, userTenants, chemicals, ruhReports, risks] = await Promise.all([
    prisma.exposureRegister.findFirst({
      where: { id, tenantId },
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.chemical.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, productName: true, casNumber: true },
      orderBy: { productName: "asc" },
    }),
    prisma.ruhReport.findMany({
      where: { tenantId },
      select: { id: true, ruhNummer: true, title: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.risk.findMany({
      where: { tenantId, status: { not: "CLOSED" } },
      select: {
        id: true, title: true, score: true, likelihood: true, consequence: true, status: true,
        riskAssessment: { select: { title: true, assessmentYear: true } },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!entry) notFound();

  const employees = userTenants.map((ut) => ({
    id: ut.user.id,
    name: ut.user.name,
    email: ut.user.email,
    department: ut.department,
    employeeNumber: ut.employeeNumber ?? null,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/exposure-register"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Tilbake til register
        </Link>
        <h1 className="text-2xl font-bold">Rediger eksponering</h1>
        <p className="text-sm text-muted-foreground">
          {entry.employeeName} – {entry.exposureAgent}
        </p>
      </div>

      <ExposureRegisterFormClient employees={employees} chemicals={chemicals} ruhReports={ruhReports} risks={risks} existing={entry} />
    </div>
  );
}
