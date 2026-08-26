"use client";

import { useQuery } from "@tanstack/react-query";
import { UserManagement } from "@/features/settings/components/user-management";
import { fetchUsers } from "@/server/queries/users.queries";

type UsersData = NonNullable<Awaited<ReturnType<typeof fetchUsers>>>;

interface UsersContentProps {
  initialData: UsersData;
}

export function UsersContent({ initialData }: UsersContentProps) {
  const { data } = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => fetchUsers(),
    initialData,
  });

  if (!data) return null;

  return (
    <UserManagement
      users={data.users}
      currentUserId={data.currentUserId}
      isAdmin={data.isAdmin}
      pricingTier={data.pricingTier}
      maxUsers={data.maxUsers}
    />
  );
}
