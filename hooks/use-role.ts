import { useUser } from "@clerk/nextjs";

export type Role = "super_admin" | "field_worker" | "volunteer";

export function useRole() {
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role as Role | undefined;

  return { role, isLoaded };
}
