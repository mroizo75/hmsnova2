import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchHmsTavleDetail } from "@/server/queries/hms-tavle.queries";
import { HmsTavleDetailContent } from "@/features/hms-tavle/components/hms-tavle-detail-content";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TavleAdminPage({ params, searchParams }: Props) {
  const auth = await getAuthContext();
  if (!auth || !auth.permissions.canViewHmsTavle) redirect("/dashboard");

  const { id } = await params;
  const { tab } = await searchParams;

  const initialData = await fetchHmsTavleDetail(id);
  if (!initialData) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hmsnova.no";

  return (
    <HmsTavleDetailContent
      initialData={initialData}
      tavleId={id}
      canManage={auth.permissions.canManageHmsTavle}
      canReview={auth.permissions.canReviewSubmissions}
      appUrl={appUrl}
      defaultTab={tab}
    />
  );
}
