import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchProfiles } from "@/server/queries/competence.queries";
import { CompetenceProfileList } from "@/features/training/components/competence-profile-list";

export default async function ProfilerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const auth = await getAuthContext();
  const profiles = await fetchProfiles();

  return (
    <CompetenceProfileList
      profiles={profiles}
      canCreate={auth.permissions.canCreateTraining}
    />
  );
}
