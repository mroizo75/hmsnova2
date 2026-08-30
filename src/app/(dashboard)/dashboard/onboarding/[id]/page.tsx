import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBoardingById } from "@/server/queries/boarding.queries";
import { BoardingDetail } from "@/features/boarding/components/boarding-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardingDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuthContext();

  if (!auth.permissions.canReadAllBoarding && !auth.permissions.canReadOwnBoarding) {
    redirect("/dashboard");
  }

  const boarding = await fetchBoardingById(id);
  if (!boarding) notFound();

  return (
    <BoardingDetail
      boarding={boarding}
      canEdit={auth.permissions.canCreateBoarding}
      currentUserId={auth.userId}
    />
  );
}
