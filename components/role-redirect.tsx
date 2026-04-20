"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/hooks/use-role";

export function RoleRedirect() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role as Role;
      if (role === "super_admin") {
        router.push("/admin/dashboard");
      } else if (role === "field_worker") {
        router.push("/worker/dashboard");
      } else if (role === "volunteer") {
        router.push("/volunteer/dashboard");
      } else {
        // Default or error state if no role is found
        router.push("/onboarding");
      }
    }
  }, [isLoaded, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

