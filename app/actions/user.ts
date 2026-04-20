"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "@/hooks/use-role";

export async function updateUserRole(userId: string, role: Role) {
  const client = await clerkClient();
  
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: role,
    },
  });
  
  return { success: true };
}
