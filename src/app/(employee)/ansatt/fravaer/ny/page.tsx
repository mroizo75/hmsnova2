import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";

export default async function AnsattNyFravaerPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canCreateAbsence) redirect("/ansatt/fravaer");
  redirect("/ansatt/timeregistrering?mode=absence");
}
