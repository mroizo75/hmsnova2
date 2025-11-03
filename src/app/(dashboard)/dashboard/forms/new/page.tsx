import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FormBuilder } from "@/components/forms/form-builder";

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  return (
    <div>
      <FormBuilder tenantId={session.user.tenantId} />
    </div>
  );
}

